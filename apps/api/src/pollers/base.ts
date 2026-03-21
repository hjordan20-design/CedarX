/**
 * BasePoller — abstract base class for all CedarX chain pollers.
 *
 * Each protocol (Fabrica, 4K, Courtyard) and the CedarX swap contract gets its
 * own concrete subclass. The base class handles:
 *
 *   - Cursor management (read last processed block from DB, persist after
 *     each successful tick so restarts resume cleanly)
 *   - Tick scheduling (setInterval with configurable interval)
 *   - Error isolation (one poller crashing doesn't bring down others)
 *   - Structured logging (every log line prefixed with the poller ID)
 *
 * Subclasses implement `poll(fromBlock, toBlock)` and nothing else.
 *
 * Chain selection:
 *   Pass 'mainnet' to pin to Ethereum mainnet regardless of CHAIN_ENV.
 *   Pass 'polygon' to use the Polygon RPC.
 *   Omit (or pass undefined) to follow CHAIN_ENV — used by CedarXSwapPoller
 *   so it can follow the deployment chain (Sepolia for testing).
 */

import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, sepolia, polygon } from "viem/chains";
import {
    CHAIN_ENV,
    POLL_INTERVAL_MS,
    BLOCKS_PER_SCAN,
    ETH_MAINNET_RPC,
    ETH_SEPOLIA_RPC,
    POLYGON_RPC,
} from "../config";
import { getCursor, setCursor } from "../db/queries";

export type PollerChain = "mainnet" | "sepolia" | "polygon";

export abstract class BasePoller {
    /** Unique identifier for this poller — stored in indexer_cursors.poller_id */
    abstract readonly pollerId: string;

    /** The block number from which this protocol was first deployed.
     *  Pollers will not scan before this block. */
    abstract readonly startBlock: number;

    protected readonly client: PublicClient;
    private _timer: ReturnType<typeof setInterval> | null = null;
    private _running = false;

    /**
     * @param chain  Force a specific chain.
     *               - 'mainnet': always Ethereum L1 (Fabrica, 4K)
     *               - 'polygon': always Polygon PoS (Courtyard)
     *               - 'sepolia': Ethereum Sepolia testnet
     *               - undefined: follow CHAIN_ENV (CedarXSwapPoller)
     */
    constructor(chain?: PollerChain) {
        const resolved = chain ?? CHAIN_ENV;
        let viemChain, rpcUrl: string;

        if (resolved === "polygon") {
            viemChain = polygon;
            rpcUrl = POLYGON_RPC;
        } else if (resolved === "sepolia") {
            viemChain = sepolia;
            rpcUrl = ETH_SEPOLIA_RPC;
        } else {
            viemChain = mainnet;
            rpcUrl = ETH_MAINNET_RPC;
        }

        this.client = createPublicClient({
            chain: viemChain,
            transport: http(rpcUrl),
        }) as PublicClient;
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────

    /** Start the poller.  Runs one tick immediately, then every POLL_INTERVAL_MS. */
    start(): void {
        if (this._running) return;
        this._running = true;
        this.log("starting");

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

            const fromBlock = Math.max(lastProcessed + 1, this.startBlock);

            if (fromBlock > latestBlock) {
                this.log(`up to date at block ${latestBlock}`);
                return;
            }

            let cursor = fromBlock;
            while (cursor <= latestBlock) {
                const toBlock = Math.min(cursor + BLOCKS_PER_SCAN - 1, latestBlock);
                this.log(`scanning blocks ${cursor}–${toBlock}`);
                await this.poll(cursor, toBlock);
                await setCursor(this.pollerId, toBlock);
                cursor = toBlock + 1;
            }
        } catch (err) {
            this.logError("tick failed", err);
        }
    }

    // ─── Abstract interface ───────────────────────────────────────────────────

    protected abstract poll(fromBlock: number, toBlock: number): Promise<void>;

    // ─── Logging ─────────────────────────────────────────────────────────────

    protected log(msg: string): void {
        console.log(`[${this.pollerId}] ${msg}`);
    }

    protected logError(msg: string, err: unknown): void {
        console.error(`[${this.pollerId}] ${msg}:`, err instanceof Error ? err.message : err);
    }
}
