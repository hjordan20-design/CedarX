/**
 * CollectionSweepPoller — full-collection NFT indexer.
 *
 * Strategy
 * --------
 * For each whitelisted collection, paginate OpenSea's
 * GET /api/v2/collection/{slug}/nfts endpoint to discover every minted NFT —
 * not just those with active listings.  Each token is upserted into the assets
 * table with has_active_listing=false (preserving any existing listing state
 * for already-indexed tokens).
 *
 * Checkpoint / resume
 * -------------------
 * OpenSea uses opaque string cursors for pagination.  The poller persists the
 * current cursor to the indexer_cursors table (cursor_text column) after every
 * CHECKPOINT_PAGES pages so that a server restart resumes from the last saved
 * page rather than scanning from the beginning.  When a collection sweep
 * completes, its cursor is cleared (set to null) so the next run restarts.
 *
 * Schedule
 * --------
 * The sweep runs once immediately at startup, then repeats every
 * SWEEP_INTERVAL_MS (default 24 h).  This keeps the asset index fresh as new
 * NFTs are minted, without hammering the API continuously.
 *
 * Rate limiting
 * -------------
 * OpenSea allows ~4 req/s with an API key.  We sleep SWEEP_DELAY_MS (250 ms)
 * between every paginated request and back off 10 s on 429 responses.
 *
 * Scale note
 * ----------
 * Courtyard has ~261 K NFTs.  At 200 items/page × 250 ms/page that is ~1 305
 * pages × 250 ms ≈ 5–15 minutes, depending on server and API latency.
 * Progress is logged every LOG_EVERY assets.
 */

import {
    OPENSEA_API_KEY,
    OPENSEA_API_BASE_URL,
} from "../config";
import {
    upsertAssetFromSweep,
    getSweepCursor,
    setSweepCursor,
} from "../db/queries";
import {
    buildContracts,
    buildAssetId,
    normalizeOpenSeaNFT,
    sleep,
    type ContractConfig,
    type OpenSeaNFT,
} from "./seaport";

// ─── Constants ────────────────────────────────────────────────────────────────

/** ms between OpenSea NFT-list requests (~4 req/s with API key) */
const SWEEP_DELAY_MS = 250;

/** How often to re-run the full sweep (24 h) */
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Maximum NFTs per page (OpenSea caps this at 200) */
const PAGE_LIMIT = 200;

/** Save cursor to DB every N pages so restarts resume from a nearby position */
const CHECKPOINT_PAGES = 10; // every 10 × 200 = 2 000 assets

/** Log a progress line every N assets */
const LOG_EVERY = 100;

// ─── CollectionSweepPoller ────────────────────────────────────────────────────

export class CollectionSweepPoller {
    private timer: ReturnType<typeof setInterval> | null = null;
    private running = false;

    start(): void {
        if (this.running) return;
        this.running = true;
        this.log("starting collection sweep");
        void this.runSweep();
        this.timer = setInterval(() => void this.runSweep(), SWEEP_INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.running = false;
        this.log("stopped");
    }

    // ── Top-level sweep: iterate over all collections ─────────────────────────

    private async runSweep(): Promise<void> {
        if (!OPENSEA_API_KEY) {
            this.log("OPENSEA_API_KEY not set — skipping");
            return;
        }

        const contracts = buildContracts();
        if (!contracts.length) {
            this.log("no whitelisted contracts configured — skipping");
            return;
        }

        this.log(`sweep started — ${contracts.length} collection(s)`);

        for (const contract of contracts) {
            if (!this.running) break;
            try {
                await this.sweepContract(contract);
            } catch (err) {
                this.logError(`[${contract.protocol}] sweep failed`, err);
            }
        }

        this.log("sweep cycle complete");
    }

    // ── Sweep a single collection ──────────────────────────────────────────────

    private async sweepContract(contract: ContractConfig): Promise<void> {
        const pollerId = `sweep-${contract.protocol}`;

        // Resume from the last saved cursor (null = start from the beginning)
        let cursor = await getSweepCursor(pollerId);
        let totalIndexed = 0;
        let pageCount = 0;

        this.log(
            `[${contract.protocol}] sweep start — slug: ${contract.openSeaSlug}` +
            (cursor ? `, resuming from cursor` : `, fresh start`)
        );

        do {
            if (!this.running) {
                this.log(`[${contract.protocol}] sweep interrupted at page ${pageCount}`);
                // Save cursor so we can resume later
                await setSweepCursor(pollerId, cursor).catch(() => {});
                return;
            }

            const url = new URL(
                `${OPENSEA_API_BASE_URL}/api/v2/collection/${contract.openSeaSlug}/nfts`
            );
            url.searchParams.set("limit", String(PAGE_LIMIT));
            if (cursor) url.searchParams.set("next", cursor);

            let body: { nfts: OpenSeaNFT[]; next: string | null };

            try {
                const res = await fetch(url.toString(), {
                    headers: { "X-API-KEY": OPENSEA_API_KEY, "accept": "application/json" },
                });

                if (res.status === 429) {
                    this.log(`[${contract.protocol}] rate limited on page ${pageCount} — backing off 10s`);
                    await sleep(10_000);
                    continue; // retry same cursor
                }

                if (!res.ok) {
                    const text = await res.text();
                    this.logError(
                        `[${contract.protocol}] OpenSea returned ${res.status} on page ${pageCount}`,
                        text
                    );
                    break;
                }

                body = await res.json() as { nfts: OpenSeaNFT[]; next: string | null };
            } catch (err) {
                this.logError(`[${contract.protocol}] network error on page ${pageCount}`, err);
                await sleep(5_000);
                break;
            }

            const nfts = body.nfts ?? [];
            let pageInserted = 0;

            for (const nft of nfts) {
                if (!this.running) break;
                try {
                    const assetRow = normalizeOpenSeaNFT(nft, contract);
                    const isNew = await upsertAssetFromSweep(assetRow);
                    if (isNew) pageInserted++;
                    totalIndexed++;

                    if (totalIndexed % LOG_EVERY === 0) {
                        this.log(
                            `[${contract.protocol}] ${totalIndexed} assets indexed` +
                            ` (page ${pageCount + 1}, ${pageInserted} new this page)`
                        );
                    }
                } catch (err) {
                    this.logError(
                        `[${contract.protocol}] failed to index token ${nft.identifier}`,
                        err
                    );
                }
            }

            cursor = body.next ?? null;
            pageCount++;

            // Checkpoint: persist cursor periodically so restarts can resume
            if (pageCount % CHECKPOINT_PAGES === 0 || !cursor) {
                try {
                    await setSweepCursor(pollerId, cursor);
                } catch (err) {
                    this.logError(`[${contract.protocol}] failed to save cursor checkpoint`, err);
                }
            }

            if (cursor) await sleep(SWEEP_DELAY_MS);

        } while (cursor);

        // Clear cursor on completion so the next scheduled run restarts fresh
        try {
            await setSweepCursor(pollerId, null);
        } catch (_) { /* non-fatal */ }

        this.log(
            `[${contract.protocol}] sweep complete — ` +
            `${totalIndexed} total assets indexed across ${pageCount} page(s)`
        );
    }

    // ── Logging ───────────────────────────────────────────────────────────────

    private log(msg: string): void {
        console.log(`[collection-sweep] ${msg}`);
    }

    private logError(msg: string, err: unknown): void {
        console.error(
            `[collection-sweep] ${msg}:`,
            err instanceof Error ? err.message : err
        );
    }
}
