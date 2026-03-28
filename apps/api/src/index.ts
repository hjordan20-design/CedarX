/**
 * CedarX Indexer — entry point.
 *
 * Starts the Express API server and the FabricaRetsPoller.
 * All other pollers are disabled — RETS is the sole data source for listings.
 *
 * DISABLED pollers (kept for reference):
 *   - SeaportPoller       — OpenSea listings API; all contracts commented out
 *   - CollectionSweepPoller — OpenSea collection NFTs; no longer needed
 *   - FabricaPoller       — Alchemy Transfer events; cost risk
 *   - FourKPoller         — Alchemy Transfer events; cost risk
 *   - CourtyardPoller     — Alchemy Transfer events; cost risk
 *   - CedarXSwapPoller    — Alchemy swap events; cost risk
 */

import { createServer } from "./server";
import { PORT } from "./config";
import { FabricaRetsPoller } from "./pollers/fabricaRets";

// ── Disabled pollers ──────────────────────────────────────────────────────────
// import { SeaportPoller }         from "./pollers/seaport";
// import { CollectionSweepPoller } from "./pollers/collectionSweep";
// import { FabricaPoller }    from "./pollers/fabrica";
// import { FourKPoller }      from "./pollers/4k";
// import { CourtyardPoller }  from "./pollers/courtyard";
// import { CedarXSwapPoller } from "./pollers/cedarxSwap";

// ── Start API server ──────────────────────────────────────────────────────────

const app = createServer();
app.listen(PORT, () => {
    console.log(`CedarX API listening on port ${PORT}`);
});

// ── Start pollers ─────────────────────────────────────────────────────────────

const pollers = [
    new FabricaRetsPoller(), // sole active poller — Fabrica RETS feed, every 15 min
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
