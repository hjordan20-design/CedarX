/**
 * FabricaPoller — indexes Fabrica land NFTs (ERC-1155) on Ethereum mainnet.
 *
 * Strategy:
 *   1. Scan TransferSingle and TransferBatch events on the Fabrica Land contract.
 *   2. Collect every unique token ID and its latest recipient (= current owner).
 *      Skip burns (to = zeroAddress).
 *   3. Resolve the metadata URL for each token via a two-tier strategy:
 *        Tier 1: call uri(tokenId) on the main contract.
 *        Tier 2 (fallback): read defaultValidator() → baseUri() once, then
 *                           construct {baseUri}{decimal(tokenId)} directly.
 *      Tier 2 is needed because uri() reverts if the contract's _defaultValidator
 *      is address(0) — the validator's uri() concatenates _baseUri + decimal id,
 *      so we can replicate that without going through the main contract.
 *   4. Fetch the metadata JSON (HTTPS or IPFS).
 *   5. Normalize into CedarXAsset and upsert into the database.
 *
 * Fabrica Land (FAB): 0x5cbeb7A0df7Ed85D82a472FD56d81ed550f3Ea95 (ERC-1155, Ethereum mainnet)
 * Validator pattern: baseUri + Strings.toString(tokenId)  (decimal, no {id} template)
 * Metadata host:     metadata.fabrica.land/{network}/{contractAddress}/{tokenId}
 */

import { parseAbiItem, parseAbi, zeroAddress } from "viem";
import { BasePoller } from "./base";
import { FABRICA_TOKEN_V2 } from "../config";
import { upsertAsset } from "../db/queries";
import { fetchIPFSJson, resolveImageUrl } from "../lib/ipfs";
import { normalizeFabricaAsset, type FabricaTokenMetadata } from "../normalizers/fabrica";

// ERC-1155 transfer events
const TRANSFER_SINGLE_EVENT = parseAbiItem(
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)"
);
const TRANSFER_BATCH_EVENT = parseAbiItem(
    "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
);

// Main contract: standard ERC-1155 uri() + defaultValidator() getter
const FABRICA_MAIN_ABI = parseAbi([
    "function uri(uint256 id) view returns (string)",
    "function defaultValidator() view returns (address)",
]);

// Validator contract: baseUri() getter (FabricaValidator.sol)
const FABRICA_VALIDATOR_ABI = parseAbi([
    "function uri(uint256 id) view returns (string)",
    "function baseUri() view returns (string)",
]);

// Known fallback pattern if on-chain reads fail (matches validator _baseUri in production)
const METADATA_FALLBACK_BASE =
    `https://metadata.fabrica.land/mainnet/${FABRICA_TOKEN_V2}/`;

// Small delay between metadata fetches to avoid hammering remote servers
const FETCH_DELAY_MS = 300;

export class FabricaPoller extends BasePoller {
    readonly pollerId = "fabrica";
    // Fabrica Land (FAB) ERC-1155 — first transfers around block 17_000_000
    readonly startBlock = 17_000_000;

    // Cached base URI resolved from defaultValidator().baseUri()
    // undefined = not yet resolved; string = resolved (may be the fallback)
    private _metadataBaseUri: string | undefined;

    constructor() {
        super("mainnet"); // always Ethereum mainnet
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        // ── Step 1: Collect token IDs and their latest recipient ──────────────
        const tokenOwners = new Map<bigint, `0x${string}`>();

        const singleLogs = await this.client.getLogs({
            address: FABRICA_TOKEN_V2,
            event: TRANSFER_SINGLE_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        for (const log of singleLogs) {
            const { id, to } = log.args;
            if (id !== undefined && to && to !== zeroAddress) {
                tokenOwners.set(id, to);
            }
        }

        const batchLogs = await this.client.getLogs({
            address: FABRICA_TOKEN_V2,
            event: TRANSFER_BATCH_EVENT,
            fromBlock: BigInt(fromBlock),
            toBlock: BigInt(toBlock),
        });

        for (const log of batchLogs) {
            const { ids, to } = log.args;
            if (!ids || !to || to === zeroAddress) continue;
            for (const id of ids) {
                tokenOwners.set(id, to);
            }
        }

        if (tokenOwners.size === 0) {
            this.log(`no transfers in blocks ${fromBlock}–${toBlock}`);
            return;
        }

        this.log(
            `found ${tokenOwners.size} unique token(s) from ` +
            `${singleLogs.length} TransferSingle + ${batchLogs.length} TransferBatch event(s)`
        );

        // ── Step 2: Fetch metadata for each token ─────────────────────────────
        for (const [tokenId, owner] of tokenOwners) {
            try {
                await this._processToken(tokenId, owner);
                await sleep(FETCH_DELAY_MS);
            } catch (err) {
                this.logError(`failed to process token #${tokenId}`, err);
            }
        }
    }

    /**
     * Resolve the metadata base URI once per process lifetime.
     *
     * Tier 1: read defaultValidator() from the main contract, then baseUri()
     *         from the validator contract.
     * Tier 2: fall back to the known production URL pattern so the poller keeps
     *         running even if on-chain reads fail.
     */
    private async _resolveBaseUri(): Promise<string> {
        if (this._metadataBaseUri !== undefined) return this._metadataBaseUri;

        try {
            const validatorAddr = await this.client.readContract({
                address: FABRICA_TOKEN_V2,
                abi: FABRICA_MAIN_ABI,
                functionName: "defaultValidator",
            });

            if (!validatorAddr || validatorAddr === zeroAddress) {
                throw new Error("defaultValidator() returned zero address");
            }

            const base = await this.client.readContract({
                address: validatorAddr,
                abi: FABRICA_VALIDATOR_ABI,
                functionName: "baseUri",
            });

            if (!base) throw new Error("baseUri() returned empty string");

            this._metadataBaseUri = base;
            this.log(`metadata base URI (from validator): ${base}`);
        } catch (err) {
            this._metadataBaseUri = METADATA_FALLBACK_BASE;
            this.log(
                `could not read validator baseUri() (${String(err)}), ` +
                `using fallback: ${METADATA_FALLBACK_BASE}`
            );
        }

        return this._metadataBaseUri;
    }

    private async _processToken(tokenId: bigint, owner: `0x${string}`): Promise<void> {
        // ── Tier 1: standard ERC-1155 uri() ───────────────────────────────────
        let tokenUri: string | null = null;
        try {
            tokenUri = await this.client.readContract({
                address: FABRICA_TOKEN_V2,
                abi: FABRICA_MAIN_ABI,
                functionName: "uri",
                args: [tokenId],
            });
        } catch {
            // uri() reverts — expected when _defaultValidator is not set.
            // Fall through to Tier 2.
        }

        // ── Tier 2: defaultValidator().baseUri() + decimal tokenId ────────────
        if (!tokenUri) {
            const baseUri = await this._resolveBaseUri();
            // FabricaValidator.uri() = _baseUri + Strings.toString(id)  (decimal)
            tokenUri = `${baseUri}${tokenId.toString(10)}`;
            this.log(`token #${tokenId}: using constructed URI ${tokenUri}`);
        }

        // ERC-1155 {id} template substitution (if the URI uses it)
        const resolvedUri = tokenUri.replace(
            "{id}",
            tokenId.toString(16).padStart(64, "0")
        );

        const metadata = await fetchIPFSJson<FabricaTokenMetadata>(resolvedUri);

        if (metadata.image) {
            metadata.image = resolveImageUrl(metadata.image) ?? metadata.image;
        }

        const asset = normalizeFabricaAsset(tokenId.toString(), owner, metadata);
        await upsertAsset(asset);

        this.log(`upserted Fabrica token #${tokenId} — "${asset.name}"`);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
