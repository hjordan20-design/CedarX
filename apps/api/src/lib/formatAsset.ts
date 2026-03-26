/**
 * Maps DB row (snake_case) → camelCase Asset response object.
 * Shared by assets.ts and homepage.ts routes.
 */
export type SeaportPriceMap = Map<string, { price: string; symbol: string; decimals: number }>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatAsset(row: any, seaportPrices?: SeaportPriceMap) {
    let currentListingPrice: number | undefined;
    if (row.current_listing_price != null) {
        const n = Number(row.current_listing_price);
        if (!isNaN(n)) currentListingPrice = n;
    }
    let currentListingPaymentTokenSymbol: string | undefined =
        row.current_listing_payment_token_symbol ?? undefined;

    if (currentListingPrice == null && seaportPrices) {
        const sp = seaportPrices.get(row.id);
        if (sp) {
            currentListingPrice = Number(sp.price) / Math.pow(10, sp.decimals);
            currentListingPaymentTokenSymbol = sp.symbol;
        }
    }

    return {
        id: row.id,
        protocol: row.protocol,
        contractAddress: row.contract_address,
        tokenId: row.token_id ?? undefined,
        tokenStandard: row.token_standard,
        chain: row.chain,
        name: row.name,
        description: row.description ?? undefined,
        category: row.category,
        imageUrl: row.image_url ?? undefined,
        details: row.details ?? {},
        lastSalePrice: row.last_sale_price ?? undefined,
        currentListingPrice,
        currentListingPaymentTokenSymbol,
        hasActiveListing: row.has_active_listing ?? false,
        totalVolume: row.total_volume ?? 0,
        externalUrl: row.external_url ?? undefined,
        lastUpdated: row.last_updated,
    };
}
