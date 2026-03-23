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

// Alchemy free-tier apps are network-specific. Polygon requires its own app key.
// ALCHEMY_POLYGON_API_KEY falls back to ALCHEMY_API_KEY if not set, but a
// Polygon-specific key is required on the free tier to avoid "MATIC_MAIN" errors.
const ALCHEMY_POLYGON_KEY = process.env["ALCHEMY_POLYGON_API_KEY"] || ALCHEMY_API_KEY;

export const ETH_MAINNET_RPC = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const ETH_SEPOLIA_RPC = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const POLYGON_RPC     = optional_env(
    "POLYGON_RPC_URL",
    `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_POLYGON_KEY}`
);

// Which chain the CedarX swap contract is on: "mainnet" or "sepolia"
export const CHAIN_ENV = optional_env("CHAIN_ENV", "mainnet") as "mainnet" | "sepolia";
export const RPC_URL = CHAIN_ENV === "sepolia" ? ETH_SEPOLIA_RPC : ETH_MAINNET_RPC;

// ─── Contract addresses ───────────────────────────────────────────────────────

// CedarX swap — optional until deployed; CedarXSwapPoller skips if empty
export const CEDARX_SWAP_ADDRESS = optional_env("CEDARX_SWAP_CONTRACT_ADDRESS", "") as `0x${string}`;
// Polygon swap contract (separate deployment; optional)
export const CEDARX_SWAP_POLYGON_ADDRESS = optional_env("CEDARX_SWAP_POLYGON_ADDRESS", "") as `0x${string}`;

// Fabrica Land (FAB) — ERC-1155, Ethereum mainnet
// Verified: https://etherscan.io/address/0x5cbeb7A0df7Ed85D82a472FD56d81ed550f3Ea95
export const FABRICA_TOKEN_V2 = optional_env(
    "FABRICA_CONTRACT_ADDRESS",
    "0x5cbeb7A0df7Ed85D82a472FD56d81ed550f3Ea95"
) as `0x${string}`;

// 4K Protocol (ERC-1155 luxury goods, Ethereum mainnet)
// Verified: https://etherscan.io/address/0xEBf19415d94be89A1d692F82af391685dC1Bff79
export const FOURTK_CONTRACT = optional_env(
    "FOURTK_CONTRACT_ADDRESS",
    "0xEBf19415d94be89A1d692F82af391685dC1Bff79"
) as `0x${string}`;

// Courtyard NFT (ERC-721 collectibles, Polygon)
// Verified: https://polygonscan.com/token/0x251be3a17af4892035c37ebf5890f4a4d889dcad
export const COURTYARD_CONTRACT = optional_env(
    "COURTYARD_CONTRACT_ADDRESS",
    "0x251be3a17af4892035c37ebf5890f4a4d889dcad"
) as `0x${string}`;

// ─── OpenSea / Seaport ────────────────────────────────────────────────────────

// Free tier: https://docs.opensea.io/reference/api-keys
// Rate limited to ~2 req/s. Leave empty to disable Seaport order polling.
export const OPENSEA_API_KEY      = optional_env("OPENSEA_API_KEY", "");
export const OPENSEA_API_BASE_URL = optional_env("OPENSEA_API_BASE_URL", "https://api.opensea.io");

// Wallet that receives the 1.5% CedarX fee on Seaport listings created via CedarX.
// Must be set for seller listing flow; unused for inbound order indexing.
export const CEDARX_FEE_WALLET = optional_env("CEDARX_FEE_WALLET", "") as `0x${string}`;
export const CEDARX_FEE_BPS    = 150; // 1.5%

// How often the Seaport order poller runs (independent of block polling)
export const SEAPORT_POLL_INTERVAL_MS = Number(optional_env("SEAPORT_POLL_INTERVAL_MS", "300000")); // 5 min

// ─── Indexer behaviour ────────────────────────────────────────────────────────

export const POLL_INTERVAL_MS = Number(optional_env("POLL_INTERVAL_MS", "180000")); // 3 min
export const BLOCKS_PER_SCAN  = Number(optional_env("BLOCKS_PER_SCAN", "2000"));

// ─── API server ───────────────────────────────────────────────────────────────

export const PORT = Number(optional_env("PORT", "3001"));

export const CORS_ORIGINS = optional_env("CORS_ORIGINS", "http://localhost:5173,https://cedarx.io")
    .split(",")
    .map((o) => o.trim());
