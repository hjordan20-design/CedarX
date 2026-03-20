/**
 * RealT normalizer — converts RealT API property data into the unified
 * CedarXAsset schema.
 *
 * Session 3: type definitions and stub.
 * Session 4: full implementation.
 *
 * RealT API docs: https://api.realt.community/v1/token
 */

import type { AssetInsert } from "../db/types";

/** Shape of a single token returned by the RealT API */
export interface RealTApiToken {
    uuid: string;
    shortName: string;
    fullName: string;
    tokenPrice: number;
    annualPercentageYield: number;
    netRentDayPerToken: number;     // Daily rent per token in USD
    totalTokens: number;
    contractAddress: string;        // Ethereum address
    propertyType: number;           // 1=SFR, 2=Multi, 3=Duplex, etc.
    squareFeet: number;
    bedroom: number;
    bathroom: number;
    rentedUnits: number;
    totalUnits: number;
    imageLink: string[];
    externalLinks?: string[];
    propertyMainImage?: string;
}

const PROPERTY_TYPE_MAP: Record<number, string> = {
    1: "Single Family",
    2: "Multi-Family",
    3: "Duplex",
    4: "Condominium",
    6: "Mixed-Use",
    8: "Commercial",
    9: "SFR Portfolio",
};

export function normalizeRealTAsset(token: RealTApiToken): AssetInsert {
    const address = token.contractAddress.toLowerCase();
    const id = `realt:1:${address}`;
    const annualRent = token.netRentDayPerToken * 365 * token.totalTokens;

    return {
        id,
        protocol: "realt",
        contract_address: address,
        token_id: null,
        token_standard: "ERC-20",
        chain: "ethereum",
        name: token.shortName ?? token.fullName,
        description: null,
        category: "rental-property",
        image_url: token.propertyMainImage ?? token.imageLink?.[0] ?? null,
        external_url: `https://realt.co/product/${token.uuid}`,
        details: {
            property_address: token.fullName,
            property_type: PROPERTY_TYPE_MAP[token.propertyType] ?? "Residential",
            annual_rent: annualRent,
            rental_yield: token.annualPercentageYield / 100,
            token_price: token.tokenPrice,
            total_tokens: token.totalTokens,
        },
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
