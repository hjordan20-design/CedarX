/**
 * Courtyard normalizer — converts Courtyard NFT metadata into the unified
 * CedarXAsset schema stored in the `assets` table.
 *
 * Courtyard tokenizes physical collectibles (trading cards, Pokémon cards,
 * sports memorabilia) as ERC-721 on Polygon. Items are stored in Courtyard's
 * vault; token holders can redeem the physical item at any time.
 */

import type { AssetInsert } from "../db/types";
import { COURTYARD_CONTRACT } from "../config";

/** Raw metadata as returned by the Courtyard token URI */
export interface CourtyardTokenMetadata {
    name: string;
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
}

/** Normalize a Courtyard token into a CedarXAsset DB row */
export function normalizeCourtyardAsset(
    tokenId: string,
    owner: string,
    metadata: CourtyardTokenMetadata
): AssetInsert {
    const id = `courtyard:137:${COURTYARD_CONTRACT.toLowerCase()}:${tokenId}`;

    const attr = (key: string): string | number | undefined =>
        metadata.attributes?.find(
            (a) => a.trait_type.toLowerCase() === key.toLowerCase()
        )?.value;

    // Determine sub-category from metadata; default to collectibles
    const categoryAttr = (attr("type") ?? attr("category") ?? "") as string;
    const isArt = categoryAttr.toLowerCase().includes("art");

    return {
        id,
        protocol: "courtyard",
        contract_address: COURTYARD_CONTRACT.toLowerCase(),
        token_id: tokenId,
        token_standard: "ERC-721",
        chain: "polygon",
        name: metadata.name ?? `Courtyard Item #${tokenId}`,
        description: metadata.description ?? null,
        category: isArt ? "art" : "collectibles",
        image_url: metadata.image ?? null,
        external_url:
            metadata.external_url ??
            `https://courtyard.io/token/${COURTYARD_CONTRACT}/${tokenId}`,
        details: {
            brand:     attr("brand")      as string | undefined,
            series:    attr("series")     as string | undefined,
            edition:   attr("set")        as string | undefined,
            condition: (attr("condition") ?? attr("grade")) as string | undefined,
            grade:     attr("grade")      as string | undefined,
            provenance: attr("year")      ? `${attr("year")}` : undefined,
        },
        has_active_listing: false,
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
