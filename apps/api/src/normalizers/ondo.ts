/**
 * Ondo normalizer — converts Ondo Finance on-chain data into the unified
 * CedarXAsset schema.
 */

import type { AssetInsert } from "../db/types";

/** Data fetched for each Ondo token (from contract + oracle + Ondo API) */
export interface OndoTokenData {
    address: `0x${string}`;
    name: string;
    symbol: string;
    totalSupply: bigint;
    decimals: number;
    navPerToken: number;    // USD value per token (0 if unavailable)
    apy: number;            // As decimal, e.g. 0.052 = 5.2% (0 if unavailable)
}

const ONDO_IMAGES: Record<string, string> = {
    OUSG:  "https://assets.ondo.finance/tokens/ousg.png",
    USDY:  "https://assets.ondo.finance/tokens/usdy.png",
    rOUSG: "https://assets.ondo.finance/tokens/rousg.png",
};

const ONDO_URLS: Record<string, string> = {
    OUSG:  "https://ondo.finance/ousg",
    USDY:  "https://ondo.finance/usdy",
    rOUSG: "https://ondo.finance/ousg",
};

export function normalizeOndoAsset(data: OndoTokenData): AssetInsert {
    const id = `ondo:1:${data.address.toLowerCase()}`;
    const supplyUnits = Number(data.totalSupply) / 10 ** data.decimals;

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
        image_url: ONDO_IMAGES[data.symbol] ?? null,
        external_url: ONDO_URLS[data.symbol] ?? "https://ondo.finance",
        details: {
            ...(data.apy > 0      && { apy: data.apy }),
            ...(data.navPerToken > 0 && { nav_per_token: data.navPerToken }),
            ...(supplyUnits > 0   && { total_supply: supplyUnits }),
        },
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
