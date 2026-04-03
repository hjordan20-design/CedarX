import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import propertiesRoute from "./routes/properties.js";
import keysRoute from "./routes/keys.js";
import listingsRoute from "./routes/listings.js";
import redemptionsRoute from "./routes/redemptions.js";
import pointsRoute from "./routes/points.js";

export function createApp() {
    const app = new Hono();

    // ── Middleware ────────────────────────────────────────────────────────────
    app.use("*", cors());
    app.use("*", logger());

    // ── Health check ─────────────────────────────────────────────────────────
    app.get("/health", (c) => c.json({ status: "ok", ts: Date.now() }));

    // ── API routes ───────────────────────────────────────────────────────────
    app.route("/properties", propertiesRoute);
    app.route("/keys", keysRoute);
    app.route("/listings", listingsRoute);
    app.route("/redemptions", redemptionsRoute);
    app.route("/points", pointsRoute);

    // ── 404 ──────────────────────────────────────────────────────────────────
    app.notFound((c) => c.json({ error: "Not found" }, 404));

    // ── Error handler ────────────────────────────────────────────────────────
    app.onError((err, c) => {
        console.error("Unhandled error:", err);
        const message = err instanceof Error ? err.message : "Internal server error";
        return c.json({ error: message }, 500);
    });

    return app;
}
