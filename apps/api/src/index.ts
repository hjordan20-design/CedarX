/**
 * CedarX Indexer — entry point.
 *
 * Starts the Express API server and all chain pollers.
 * Pollers run on a background interval; the API server handles incoming requests.
 */

import { createServer } from "./server";
import { PORT } from "./config";
import { FabricaPoller }   from "./pollers/fabrica";
import { FourKPoller }     from "./pollers/4k";
import { CourtyardPoller } from "./pollers/courtyard";
import { CedarXSwapPoller } from "./pollers/cedarxSwap";

// ── Start API server ──────────────────────────────────────────────────────────

const app = createServer();
app.listen(PORT, () => {
    console.log(`CedarX API listening on port ${PORT}`);
});

// ── Start pollers ─────────────────────────────────────────────────────────────

const pollers = [
    new FabricaPoller(),    // ERC-721 real estate, Ethereum
    new FourKPoller(),      // ERC-721 luxury goods, Ethereum
    new CourtyardPoller(),  // ERC-721 collectibles, Polygon
    new CedarXSwapPoller(), // Swap contract events (follows CHAIN_ENV)
];

for (const poller of pollers) {
    poller.start();
}

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
