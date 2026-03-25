/**
 * Fabrica normalizer — converts Fabrica-specific onchain + IPFS data into the
 * unified CedarXAsset schema stored in the `assets` table.
 *
 * Session 3: type definitions and stub.
 * Session 4: full implementation.
 */

import type { AssetInsert } from "../db/types";
import { FABRICA_TOKEN_V2 } from "../config";

/** Raw data as returned by the Fabrica token URI (IPFS JSON) */
export interface FabricaTokenMetadata {
    name: string;
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
}

/** Strip the "[Low Confidence]" prefix that Fabrica's AI property detection adds. */
function stripLowConfidence(name: string): string {
    return name.replace(/^\[Low Confidence\]\s*/i, "");
}

/** Normalize a Fabrica token into a CedarXAsset DB row */
export function normalizeFabricaAsset(
    tokenId: string,
    owner: string,
    metadata: FabricaTokenMetadata
): AssetInsert {
    const id = `fabrica:1:${FABRICA_TOKEN_V2.toLowerCase()}:${tokenId}`;

    // Extract property attributes from the NFT metadata
    const attr = (key: string) =>
        metadata.attributes?.find(
            (a) => a.trait_type.toLowerCase() === key.toLowerCase()
        )?.value;

    return {
        id,
        protocol: "fabrica",
        contract_address: FABRICA_TOKEN_V2.toLowerCase(),
        token_id: tokenId,
        token_standard: "ERC-1155",
        chain: "ethereum",
        name: stripLowConfidence(metadata.name ?? `Fabrica Land #${tokenId}`),
        description: metadata.description ?? null,
        category: "real-estate",
        image_url: metadata.image ?? null,
        external_url: metadata.external_url ?? `https://fabrica.land/token/${tokenId}`,
        details: {
            location: attr("location") as string | undefined,
            acreage:  attr("acreage")  as number | undefined,
            parcel_id: attr("parcel number") as string | undefined,
            county:   attr("county")   as string | undefined,
            state:    attr("state")    as string | undefined,
        },
        has_active_listing: false,
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
