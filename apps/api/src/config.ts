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

export const ETH_MAINNET_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const ETH_SEPOLIA_RPC = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Which chain the indexer reads from: "mainnet" or "sepolia"
export const CHAIN_ENV = optional_env("CHAIN_ENV", "mainnet") as "mainnet" | "sepolia";
export const RPC_URL = CHAIN_ENV === "sepolia" ? ETH_SEPOLIA_RPC : ETH_MAINNET_RPC;

// ─── Contract addresses ───────────────────────────────────────────────────────

// Optional until the contract is deployed — the CedarXSwapPoller skips if empty
export const CEDARX_SWAP_ADDRESS = optional_env("CEDARX_SWAP_CONTRACT_ADDRESS", "") as `0x${string}`;

// Fabrica
export const FABRICA_TOKEN_V2 = optional_env(
    "FABRICA_CONTRACT_ADDRESS",
    "0x8d96b4ab6c741a4c8679ae323a100d74f085ba8f"
) as `0x${string}`;

// Ondo
export const ONDO_OUSG  = optional_env("ONDO_OUSG_ADDRESS",  "0x1b19c19393e2d034d8ff31ff34c81252fcbbee92") as `0x${string}`;
export const ONDO_USDY  = optional_env("ONDO_USDY_ADDRESS",  "0x96f6ef951840721adbf46ac996b59e0235cb985c") as `0x${string}`;
export const ONDO_ROUSG = optional_env("ONDO_ROUSG_ADDRESS", "0x6e9a65d98474f1c68406e2fe02695fe5a3e7cb0d") as `0x${string}`;

// RealT — comma-separated list of known property token addresses
// The RealT poller also fetches the authoritative list from the RealT API at runtime.
export const REALT_KNOWN_ADDRESSES = optional_env("REALT_CONTRACT_ADDRESSES", "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean) as `0x${string}`[];

// ─── Indexer behaviour ────────────────────────────────────────────────────────

// How often each poller runs (milliseconds)
export const POLL_INTERVAL_MS = Number(optional_env("POLL_INTERVAL_MS", "180000")); // 3 min

// How many blocks to scan per poller tick (to stay within Alchemy's log limit)
export const BLOCKS_PER_SCAN = Number(optional_env("BLOCKS_PER_SCAN", "2000"));

// ─── API server ───────────────────────────────────────────────────────────────

export const PORT = Number(optional_env("PORT", "3001"));

// Allowed CORS origins (comma-separated)
export const CORS_ORIGINS = optional_env("CORS_ORIGINS", "http://localhost:5173,https://cedarx.io")
    .split(",")
    .map((o) => o.trim());
