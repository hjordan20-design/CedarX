/**
 * BasePoller — abstract base class for all CedarX chain pollers.
 *
 * Each protocol (Fabrica, Ondo, RealT) and the CedarX swap contract gets its
 * own concrete subclass.  The base class handles:
 *
 *   - Cursor management (read last processed block from DB, persist after
 *     each successful tick so restarts resume cleanly)
 *   - Tick scheduling (setInterval with configurable interval)
 *   - Error isolation (one poller crashing doesn't bring down others)
 *   - Structured logging (every log line prefixed with the poller ID)
 *
 * Subclasses implement `poll(fromBlock, toBlock)` and nothing else.
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { CHAIN_ENV, POLL_INTERVAL_MS, BLOCKS_PER_SCAN, RPC_URL } from "../config";
import { getCursor, setCursor } from "../db/queries";

export abstract class BasePoller {
    /** Unique identifier for this poller — stored in indexer_cursors.poller_id */
    abstract readonly pollerId: string;

    /** The block number from which this protocol was first deployed.
     *  Pollers will not scan before this block. */
    abstract readonly startBlock: number;

    protected readonly client: PublicClient;
    private _timer: ReturnType<typeof setInterval> | null = null;
    private _running = false;

    constructor() {
        const chain = CHAIN_ENV === "sepolia" ? sepolia : mainnet;
        this.client = createPublicClient({ chain, transport: http(RPC_URL) }) as PublicClient;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /** Start the poller.  Runs one tick immediately, then every POLL_INTERVAL_MS. */
    start(): void {
        if (this._running) return;
        this._running = true;
        this.log("starting");

        // Fire immediately, then on interval
        void this._tick();
        this._timer = setInterval(() => void this._tick(), POLL_INTERVAL_MS);
    }

    /** Stop the poller cleanly. */
    stop(): void {
        if (this._timer) clearInterval(this._timer);
        this._running = false;
        this.log("stopped");
    }

    // ─── Core tick ────────────────────────────────────────────────────────────

    private async _tick(): Promise<void> {
        try {
            const latestBlock = Number(await this.client.getBlockNumber());
            const lastProcessed = await getCursor(this.pollerId);

            // Respect the protocol's deployment block
            const fromBlock = Math.max(lastProcessed + 1, this.startBlock);

            if (fromBlock > latestBlock) {
                this.log(`up to date at block ${latestBlock}`);
                return;
            }

            // Scan in chunks to stay within Alchemy log limits
            let cursor = fromBlock;
            while (cursor <= latestBlock) {
                const toBlock = Math.min(cursor + BLOCKS_PER_SCAN - 1, latestBlock);
                this.log(`scanning blocks ${cursor}–${toBlock}`);
                await this.poll(cursor, toBlock);
                await setCursor(this.pollerId, toBlock);
                cursor = toBlock + 1;
            }
        } catch (err) {
            // Log but don't rethrow — poller keeps running
            this.logError("tick failed", err);
        }
    }

    // ─── Abstract interface ───────────────────────────────────────────────────

    /**
     * Scan the block range [fromBlock, toBlock] for events relevant to this
     * protocol.  Write any discovered assets/listings/trades to the database.
     *
     * Called by the base class — do not call directly.
     */
    protected abstract poll(fromBlock: number, toBlock: number): Promise<void>;

    // ─── Logging ─────────────────────────────────────────────────────────────

    protected log(msg: string): void {
        console.log(`[${this.pollerId}] ${msg}`);
    }

    protected logError(msg: string, err: unknown): void {
        console.error(`[${this.pollerId}] ${msg}:`, err instanceof Error ? err.message : err);
    }
}
