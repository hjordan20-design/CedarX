/**
 * 4K normalizer — converts 4K Protocol NFT metadata into the unified
 * CedarXAsset schema stored in the `assets` table.
 *
 * 4K tokenizes luxury physical goods (watches, bags, jewellery) as ERC-1155
 * on Ethereum mainnet. Burning the token redeems the physical item from custody.
 */

import type { AssetInsert } from "../db/types";
import { FOURTK_CONTRACT } from "../config";

/** Raw metadata as returned by the 4K token URI */
export interface FourKTokenMetadata {
    name: string;
    description?: string;
    image?: string;
    external_url?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
}

/** Normalize a 4K token into a CedarXAsset DB row */
export function normalize4KAsset(
    tokenId: string,
    owner: string,
    metadata: FourKTokenMetadata
): AssetInsert {
    const id = `4k:1:${FOURTK_CONTRACT.toLowerCase()}:${tokenId}`;

    const attr = (key: string): string | number | undefined =>
        metadata.attributes?.find(
            (a) => a.trait_type.toLowerCase() === key.toLowerCase()
        )?.value;

    return {
        id,
        protocol: "4k",
        contract_address: FOURTK_CONTRACT.toLowerCase(),
        token_id: tokenId,
        token_standard: "ERC-1155",
        chain: "ethereum",
        name: metadata.name ?? `4K Item #${tokenId}`,
        description: metadata.description ?? null,
        category: "luxury-goods",
        image_url: metadata.image ?? null,
        external_url:
            metadata.external_url ?? `https://www.4k.com/nft/${tokenId}`,
        details: {
            brand:     attr("brand")          as string | undefined,
            model:     attr("model")          as string | undefined,
            year:      attr("year")           as number | undefined,
            condition: attr("condition")      as string | undefined,
            serial:    attr("serial number")  as string | undefined,
        },
        last_sale_price: null,
        current_listing_price: null,
        total_volume: 0,
        last_updated: new Date().toISOString(),
    };
}
