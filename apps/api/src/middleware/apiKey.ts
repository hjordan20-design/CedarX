/**
 * API key authentication + per-key rate limiting middleware.
 *
 * Behaviour
 * ---------
 * • If the request carries no X-CedarX-API-Key header the request is allowed
 *   through (browser / frontend traffic — no rate limiting applies).
 * • If the header IS present:
 *     – Unknown key  → 401 Unauthorized
 *     – Rate exceeded → 429 Too Many Requests + Retry-After header
 *     – Valid key    → next()
 *
 * Rate limiting is tracked in-process with a plain Map (per key, per 60-second
 * sliding window).  Suitable for a single-instance server; swap for Redis if
 * you need multi-instance rate limiting later.
 *
 * Usage
 * -----
 * Apply to individual POST route handlers:
 *
 *   router.post("/fulfill", requireApiKey, async (req, res) => { ... });
 *
 * GET endpoints do NOT use this middleware — they remain public.
 */

import type { Request, Response, NextFunction } from "express";
import { lookupApiKey } from "../db/queries";

// ─── In-process rate limit store ─────────────────────────────────────────────

interface RateLimitEntry {
    count:   number;
    resetAt: number; // unix ms — when the window resets
}

const store = new Map<string, RateLimitEntry>();

/**
 * Check and increment the rate limit counter for an API key.
 * Returns { ok: true } when under the limit, or { ok: false, retryAfter }
 * (seconds until window resets) when the limit is exceeded.
 */
function checkRateLimit(
    key: string,
    limitPerMinute: number
): { ok: boolean; retryAfter?: number } {
    const now  = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
        // New window
        store.set(key, { count: 1, resetAt: now + 60_000 });
        return { ok: true };
    }

    if (entry.count >= limitPerMinute) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        return { ok: false, retryAfter };
    }

    entry.count++;
    return { ok: true };
}

// Evict expired entries roughly once per minute to prevent unbounded growth.
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
    }
}, 60_000);

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function requireApiKey(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const headerKey = req.headers["x-cedarx-api-key"];

    // No key header → browser / frontend request, allow through.
    if (!headerKey) {
        next();
        return;
    }

    const keyValue = Array.isArray(headerKey) ? (headerKey[0] ?? "") : headerKey;

    // Validate the key against the database.
    let record: { owner: string; rate_limit: number } | null;
    try {
        record = await lookupApiKey(keyValue);
    } catch (err) {
        // DB errors should not block the request outright; log and allow.
        console.error("[apiKey] DB lookup failed:", err);
        next();
        return;
    }

    if (!record) {
        res.status(401).json({
            error: "Invalid API key",
            hint:  "Pass a valid UUID in the X-CedarX-API-Key request header.",
        });
        return;
    }

    // Enforce rate limit.
    const { ok, retryAfter } = checkRateLimit(keyValue, record.rate_limit);
    if (!ok) {
        res.setHeader("Retry-After", String(retryAfter));
        res.status(429).json({
            error:      "Rate limit exceeded",
            retryAfter, // seconds
            limit:      record.rate_limit,
            window:     "60s",
        });
        return;
    }

    // Attach key metadata for downstream handlers.
    (req as Request & { apiKey?: { owner: string } }).apiKey = { owner: record.owner };
    next();
}
