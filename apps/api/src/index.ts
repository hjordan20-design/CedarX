/**
 * CedarX Indexer — entry point.
 *
 * Starts the Express API server and all chain pollers.
 * Pollers run on a background interval; the API server handles incoming requests.
 *
 * COST NOTE: The Transfer-event block scanners (Fabrica, 4K, Courtyard,
 * CedarXSwap) make continuous Alchemy RPC calls and are DISABLED to prevent
 * runaway billing.  Asset discovery is handled entirely by:
 *   - SeaportPoller      — OpenSea listings API (no Alchemy)
 *   - CollectionSweepPoller — OpenSea collection NFTs API (no Alchemy)
 * Re-enable the block scanners only if you switch to a self-hosted or
 * flat-rate RPC provider.
 */

import { createServer } from "./server";
import { PORT } from "./config";
import { SeaportPoller }         from "./pollers/seaport";
import { CollectionSweepPoller } from "./pollers/collectionSweep";

// ── Disabled (Alchemy cost) ───────────────────────────────────────────────────
// import { createPublicClient, http } from "viem";
// import { mainnet as viemMainnet, polygon as viemPolygon } from "viem/chains";
// import { ETH_MAINNET_RPC, POLYGON_RPC } from "./config";
// import { FabricaPoller }    from "./pollers/fabrica";
// import { FourKPoller }      from "./pollers/4k";
// import { CourtyardPoller }  from "./pollers/courtyard";
// import { CedarXSwapPoller } from "./pollers/cedarxSwap";
// import { getDb } from "./db/client";

// ── Start API server ──────────────────────────────────────────────────────────

const app = createServer();
app.listen(PORT, () => {
    console.log(`CedarX API listening on port ${PORT}`);
});

// ── Disabled: cursor seeding for block-based pollers ─────────────────────────
//
// seedCursors() used Alchemy RPC to fetch the current block number.
// Not needed while block-based pollers are disabled.
//
// async function seedCursors(): Promise<void> { ... }

// ── Start pollers ─────────────────────────────────────────────────────────────
//
// Only OpenSea-API-based pollers are active.  Both make HTTP requests to
// api.opensea.io — no Alchemy / RPC calls, no per-request billing.

const pollers = [
    new SeaportPoller(),         // OpenSea listings API — polls active Seaport orders
    new CollectionSweepPoller(), // OpenSea collection NFTs API — full-catalog indexer
    // new FabricaPoller(),      // DISABLED — uses Alchemy (Transfer event scanning)
    // new FourKPoller(),        // DISABLED — uses Alchemy (Transfer event scanning)
    // new CourtyardPoller(),    // DISABLED — uses Alchemy (Transfer event scanning)
    // new CedarXSwapPoller(),   // DISABLED — uses Alchemy (swap contract events)
];

for (const poller of pollers) poller.start();

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
