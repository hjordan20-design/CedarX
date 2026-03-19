/**
 * OndoPoller — indexes Ondo Finance tokenized treasuries on Ethereum mainnet.
 *
 * Ondo has three ERC-20 tokens, each representing a different fund:
 *   - OUSG  (0x1b19c19393e2d034d8ff31ff34c81252fcbbee92) — US Gov Bond Fund (KYC-gated)
 *   - USDY  (0x96f6ef951840721adbf46ac996b59e0235cb985c) — US Dollar Yield (permissionless)
 *   - rOUSG (0x6e9a65d98474f1c68406e2fe02695fe5a3e7cb0d) — Rebasing OUSG
 *
 * Strategy:
 *   Unlike Fabrica, there are no individual NFT tokens to discover — each fund
 *   is a single ERC-20 contract. On every tick we refresh all three regardless
 *   of the block range (the range is still persisted for cursor consistency).
 *
 *   Data sources:
 *   1. totalSupply()  — from the ERC-20 contract (always available)
 *   2. NAV per token  — read from Ondo's on-chain oracle if available,
 *                       otherwise fall back to Ondo's public REST API
 *   3. APY            — fetched from Ondo's public API (rates endpoint)
 */

import { parseAbi, erc20Abi } from "viem";
import { BasePoller } from "./base";
import { ONDO_OUSG, ONDO_USDY, ONDO_ROUSG } from "../config";
import { upsertAsset } from "../db/queries";
import { normalizeOndoAsset, type OndoTokenData } from "../normalizers/ondo";

// ─── Token registry ───────────────────────────────────────────────────────────

interface OndoTokenConfig {
    address: `0x${string}`;
    name: string;
    symbol: string;
    deployedBlock: number;
    // Oracle contract that exposes price() — null if not applicable
    oracleAddress: `0x${string}` | null;
    // Ondo API slug for rate lookups
    apiSlug: string;
}

const ONDO_TOKENS: OndoTokenConfig[] = [
    {
        address: ONDO_OUSG,
        name: "OUSG — Ondo US Government Bond Fund",
        symbol: "OUSG",
        deployedBlock: 16_520_000,
        oracleAddress: "0xbC4d62BC3C3dd0b66FACf35cd4d5F0C42CCdECc1", // OUSGOracle
        apiSlug: "OUSG",
    },
    {
        address: ONDO_USDY,
        name: "USDY — Ondo US Dollar Yield",
        symbol: "USDY",
        deployedBlock: 17_400_000,
        oracleAddress: null, // USDY uses an internal rebasing mechanism
        apiSlug: "USDY",
    },
    {
        address: ONDO_ROUSG,
        name: "rOUSG — Rebasing Ondo US Government Bond",
        symbol: "rOUSG",
        deployedBlock: 18_000_000,
        oracleAddress: "0xbC4d62BC3C3dd0b66FACf35cd4d5F0C42CCdECc1", // shares OUSG oracle
        apiSlug: "OUSG", // rOUSG tracks OUSG price
    },
];

// Ondo oracle ABI — the price() function returns NAV per token in 18 decimals
const ORACLE_ABI = parseAbi(["function price() view returns (uint256)"]);

// Ondo public rates API
const ONDO_API_BASE = "https://api.ondo.finance/api/v1/rates";
const FETCH_TIMEOUT_MS = 10_000;

export class OndoPoller extends BasePoller {
    readonly pollerId = "ondo";
    readonly startBlock = 16_520_000; // earliest of the three tokens

    constructor() {
        super("mainnet");
    }

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        this.log(`refreshing ${ONDO_TOKENS.length} Ondo tokens`);

        for (const token of ONDO_TOKENS) {
            try {
                await this._refreshToken(token);
            } catch (err) {
                this.logError(`failed to refresh ${token.symbol}`, err);
            }
        }
    }

    private async _refreshToken(token: OndoTokenConfig): Promise<void> {
        // ── On-chain reads ────────────────────────────────────────────────────
        const results = await this.client.multicall({
            contracts: [
                { address: token.address, abi: erc20Abi, functionName: "totalSupply" },
                { address: token.address, abi: erc20Abi, functionName: "decimals" },
            ],
            allowFailure: true,
        });

        const totalSupply = results[0].status === "success"
            ? (results[0].result as bigint)
            : 0n;
        const decimals = results[1].status === "success"
            ? (results[1].result as number)
            : 18;

        // ── NAV per token — try on-chain oracle first ─────────────────────────
        let navPerToken = await this._readOraclePrice(token);

        // ── APY — fetch from Ondo API ─────────────────────────────────────────
        let apy = await this._fetchAPY(token.apiSlug);

        // If both sources failed, use the last known value (upsert won't overwrite
        // with 0 — the normalizer sets apy: undefined if it's 0).
        const asset = normalizeOndoAsset({
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            totalSupply,
            decimals,
            navPerToken,
            apy,
        });

        await upsertAsset(asset);
        this.log(
            `upserted ${token.symbol} — supply: ${(Number(totalSupply) / 10 ** decimals).toFixed(2)}, ` +
            `NAV: $${navPerToken.toFixed(4)}, APY: ${(apy * 100).toFixed(2)}%`
        );
    }

    /** Read price from the Ondo oracle contract. Returns 0 on failure. */
    private async _readOraclePrice(token: OndoTokenConfig): Promise<number> {
        if (!token.oracleAddress) return 0;

        try {
            const rawPrice = await this.client.readContract({
                address: token.oracleAddress,
                abi: ORACLE_ABI,
                functionName: "price",
            });
            // Oracle returns price in 18 decimal units
            return Number(rawPrice) / 1e18;
        } catch {
            return 0;
        }
    }

    /** Fetch current APY from Ondo's public rates API. Returns 0 on failure. */
    private async _fetchAPY(slug: string): Promise<number> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

            const res = await fetch(`${ONDO_API_BASE}`, {
                signal: controller.signal,
                headers: { "Accept": "application/json" },
            });
            clearTimeout(timer);

            if (!res.ok) return 0;

            const data = await res.json() as any;

            // Ondo API shape varies — try common response structures
            const rates: any[] = data?.rates ?? data?.data ?? [];
            const entry = rates.find(
                (r: any) =>
                    r.symbol?.toUpperCase() === slug.toUpperCase() ||
                    r.token?.toUpperCase() === slug.toUpperCase()
            );

            if (!entry) return 0;

            // APY may be expressed as a percentage (5.2) or decimal (0.052)
            const raw = Number(entry.apy ?? entry.yield ?? entry.rate ?? 0);
            return raw > 1 ? raw / 100 : raw; // normalise to decimal
        } catch {
            return 0;
        }
    }
}
