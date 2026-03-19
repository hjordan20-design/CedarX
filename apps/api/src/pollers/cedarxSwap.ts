/**
 * CedarXSwapPoller — reads events from the CedarXSwap contract and keeps the
 * `listings` and `trades` tables in sync.
 *
 * Listens for four events defined in ICedarXSwap:
 *   - Listed(listingId, seller, tokenContract, tokenId, quantity, askingPrice, standard)
 *   - Cancelled(listingId, seller)
 *   - PriceUpdated(listingId, oldPrice, newPrice)
 *   - Sold(listingId, buyer, seller, tokenContract, tokenId, quantity, salePrice, fee)
 *
 * Session 3: scaffold only.
 * Session 5: full implementation with real log scanning and DB writes.
 */

import { BasePoller } from "./base";
import { CEDARX_SWAP_ADDRESS } from "../config";

// Minimal ABI — only the four events we care about.
// The full ABI lives in packages/shared-types once we wire up the frontend.
export const CEDARX_SWAP_ABI = [
    {
        type: "event",
        name: "Listed",
        inputs: [
            { name: "listingId",   type: "uint256", indexed: true  },
            { name: "seller",      type: "address", indexed: true  },
            { name: "tokenContract", type: "address", indexed: true },
            { name: "tokenId",     type: "uint256", indexed: false },
            { name: "quantity",    type: "uint256", indexed: false },
            { name: "askingPrice", type: "uint256", indexed: false },
            { name: "standard",    type: "uint8",   indexed: false },
        ],
    },
    {
        type: "event",
        name: "Cancelled",
        inputs: [
            { name: "listingId", type: "uint256", indexed: true },
            { name: "seller",    type: "address", indexed: true },
        ],
    },
    {
        type: "event",
        name: "PriceUpdated",
        inputs: [
            { name: "listingId", type: "uint256", indexed: true  },
            { name: "oldPrice",  type: "uint256", indexed: false },
            { name: "newPrice",  type: "uint256", indexed: false },
        ],
    },
    {
        type: "event",
        name: "Sold",
        inputs: [
            { name: "listingId",     type: "uint256", indexed: true  },
            { name: "buyer",         type: "address", indexed: true  },
            { name: "seller",        type: "address", indexed: true  },
            { name: "tokenContract", type: "address", indexed: false },
            { name: "tokenId",       type: "uint256", indexed: false },
            { name: "quantity",      type: "uint256", indexed: false },
            { name: "salePrice",     type: "uint256", indexed: false },
            { name: "fee",           type: "uint256", indexed: false },
        ],
    },
] as const;

export class CedarXSwapPoller extends BasePoller {
    readonly pollerId = "cedarx-swap";

    // Populated after Sepolia deployment; pollers skip blocks before this.
    // Set to 0 until the contract is deployed, at which point update config.ts.
    readonly startBlock = 0;

    protected async poll(fromBlock: number, toBlock: number): Promise<void> {
        if (!CEDARX_SWAP_ADDRESS || CEDARX_SWAP_ADDRESS === "0x") {
            this.log("contract address not set — skipping");
            return;
        }

        // TODO (Session 5): use viem getLogs() to fetch all four event types
        // over [fromBlock, toBlock], then:
        //   Listed     → upsertListing() with status='active'
        //   Cancelled  → setListingStatus(id, 'cancelled') + updateAssetMarketData(null price)
        //   PriceUpdated → upsertListing() with new asking_price
        //   Sold       → setListingStatus(id, 'sold') + insertTrade() + updateAssetMarketData()
        this.log(
            `[stub] would scan CedarXSwap ${CEDARX_SWAP_ADDRESS} ` +
            `blocks ${fromBlock}–${toBlock}`
        );
    }
}
