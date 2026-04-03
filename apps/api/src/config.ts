import "dotenv/config";

function require_env(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
}

function optional_env(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

// ─── Database ─────────────────────────────────────────────────────────────────

export const SUPABASE_URL        = require_env("SUPABASE_URL");
export const SUPABASE_SERVICE_KEY = require_env("SUPABASE_SERVICE_KEY");

// ─── Blockchain RPC ───────────────────────────────────────────────────────────

export const ALCHEMY_API_KEY = require_env("ALCHEMY_API_KEY");

// ─── API server ───────────────────────────────────────────────────────────────

export const PORT = Number(optional_env("PORT", "3002"));
