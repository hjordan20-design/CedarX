/**
 * CedarX Indexer — entry point.
 *
 * Starts the Express API server and all chain pollers.
 * Pollers run on a background interval; the API server handles incoming requests.
 */

import { createPublicClient, http } from "viem";
import { mainnet as viemMainnet, polygon as viemPolygon } from "viem/chains";
import { createServer } from "./server";
import { PORT, ETH_MAINNET_RPC, POLYGON_RPC } from "./config";
import { FabricaPoller }    from "./pollers/fabrica";
import { FourKPoller }      from "./pollers/4k";
import { CourtyardPoller }  from "./pollers/courtyard";
import { CedarXSwapPoller } from "./pollers/cedarxSwap";
import { getDb } from "./db/client";

// ── Start API server ──────────────────────────────────────────────────────────

const app = createServer();
app.listen(PORT, () => {
    console.log(`CedarX API listening on port ${PORT}`);
});

// ── Seed indexer cursors ──────────────────────────────────────────────────────
//
// Inserts cursor rows for pollers that have no existing progress (missing row or
// last_block = 0). Sets each poller's start position to roughly one week behind
// the current chain tip so the first scan is manageable on Alchemy free tier
// instead of trying to replay from genesis.
//
//   Ethereum blocks ≈ 7200/day → 50 000 ≈ 7 days
//   Polygon blocks  ≈ 43200/day → 200 000 ≈ 4-5 days

async function seedCursors(): Promise<void> {
    const db = getDb();

    // Temporary one-shot clients just to fetch current block numbers
    const ethClient  = createPublicClient({ chain: viemMainnet, transport: http(ETH_MAINNET_RPC) });
    const polyClient = createPublicClient({ chain: viemPolygon,  transport: http(POLYGON_RPC) });

    const [ethBlock, polyBlock] = await Promise.all([
        ethClient.getBlockNumber(),
        polyClient.getBlockNumber(),
    ]);

    const seeds = [
        { poller_id: "fabrica",   last_block: Math.max(0, Number(ethBlock)  - 50_000) },
        { poller_id: "4k",        last_block: Math.max(0, Number(ethBlock)  - 50_000) },
        { poller_id: "courtyard", last_block: Math.max(0, Number(polyBlock) - 200_000) },
    ];

    for (const seed of seeds) {
        // maybeSingle() returns null (not an error) when no row exists.
        // Cast required: Supabase codegen types for this table are not yet generated.
        const { data } = await db
            .from("indexer_cursors")
            .select("last_block")
            .eq("poller_id", seed.poller_id)
            .maybeSingle() as unknown as { data: { last_block: number } | null };

        if (data && data.last_block > 0) {
            console.log(`[seed] ${seed.poller_id} cursor already at block ${data.last_block} — skipping`);
            continue;
        }

        const { error } = await (db
            .from("indexer_cursors") as any)
            .upsert(
                { poller_id: seed.poller_id, last_block: seed.last_block, updated_at: new Date().toISOString() },
                { onConflict: "poller_id" }
            );

        if (error) {
            console.error(`[seed] failed to seed cursor for ${seed.poller_id}:`, error.message);
        } else {
            console.log(`[seed] ${seed.poller_id} cursor seeded at block ${seed.last_block}`);
        }
    }
}

// ── Start pollers ─────────────────────────────────────────────────────────────

const pollers = [
    new FabricaPoller(),    // ERC-721 real estate, Ethereum
    new FourKPoller(),      // ERC-1155 luxury goods, Ethereum
    new CourtyardPoller(),  // ERC-721 collectibles, Polygon
    new CedarXSwapPoller(), // Swap contract events (follows CHAIN_ENV)
];

// Seed cursors first, then start pollers.
// If seeding fails (e.g. Alchemy key not yet set) pollers start anyway — they
// will simply error on the first tick and retry on the next interval.
seedCursors()
    .catch((err) => {
        console.error("[seed] cursor seed failed — starting pollers anyway:", err instanceof Error ? err.message : err);
    })
    .finally(() => {
        for (const poller of pollers) poller.start();
    });

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function shutdown(signal: string) {
    console.log(`\nReceived ${signal}. Shutting down pollers...`);
    for (const poller of pollers) {
        poller.stop();
    }
    process.exit(0);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
