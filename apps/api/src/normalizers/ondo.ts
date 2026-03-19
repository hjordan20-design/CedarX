/**
 * Ondo normalizer — converts Ondo Finance on-chain data into the unified
 * CedarXAsset schema.
 *
 * Session 3: type definitions and stub.
 * Session 4: full implementation.
 */

import type { AssetInsert } from "../db/types";

/** Data fetched for each Ondo token (from contract + Ondo API) */
export interface OndoTokenData {
    address: `0x${string}`;
    name: string;
    symbol: string;
    totalSupply: bigint;    // Raw, 18 decimals
    navPerToken: number;    // USD value per token
    apy: number;            // As decimal, e.g. 0.052 = 5.2%
    deployedBlock: number;
}

export function normalizeOndoAsset(data: OndoTokenData): AssetInsert {
    const id = `ondo:1:${data.address.toLowerCase()}`;

    return {
        id,
        protocol: "ondo",
        contract_address: data.address.toLowerCase(),
        token_id: null,
        token_standard: "ERC-20",
        chain: "ethereum",
        name: data.name,
        description: null,
        category: "fixed-income",
        image_url: null,
        external_url: `https://ondo.finance/usdy`, // TODO: per-token URL in Session 4
        details: {
            apy: data.apy,
            nav_per_token: data.navPerToken,
            total_supply: Number(data.totalSupply / BigInt(1e18)),
        },
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
