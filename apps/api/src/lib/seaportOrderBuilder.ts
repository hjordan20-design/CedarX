/**
 * Seaport order parameter builder for the agent listing API.
 *
 * Constructs the unsigned OrderComponents that an agent must sign with
 * EIP-712 before submitting to POST /api/seaport/listings.
 *
 * The built order encodes CedarX's 1.5% platform fee as a second
 * consideration item — identical to how the browser sell flow works.
 */

// ─── Seaport constants ────────────────────────────────────────────────────────

const SEAPORT_ADDRESS   = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC";
const ZERO_ADDR         = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32      = "0x" + "0".repeat(64);

/** Seaport item types (EIP-712 enum) */
const ITEM_TYPE = {
    NATIVE:  0, // Native ETH
    ERC20:   1,
    ERC721:  2,
    ERC1155: 3,
} as const;

/** Seaport order types */
const ORDER_TYPE = {
    FULL_OPEN: 0,
} as const;

// ─── Payment token registry ───────────────────────────────────────────────────

interface PaymentToken {
    address:  string;
    decimals: number;
    symbol:   string;
}

const PAYMENT_TOKENS: Record<string, Record<string, PaymentToken>> = {
    ethereum: {
        ETH:  { address: ZERO_ADDR,                                      decimals: 18, symbol: "ETH"  },
        WETH: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",   decimals: 18, symbol: "WETH" },
        USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",   decimals: 6,  symbol: "USDC" },
    },
    polygon: {
        USDC: { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",   decimals: 6,  symbol: "USDC" },
        WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",   decimals: 18, symbol: "WETH" },
    },
};

// ─── EIP-712 types (matches frontend SEAPORT_EIP712_TYPES) ───────────────────

export const SEAPORT_EIP712_TYPES = {
    OrderComponents: [
        { name: "offerer",       type: "address"            },
        { name: "zone",          type: "address"            },
        { name: "offer",         type: "OfferItem[]"        },
        { name: "consideration", type: "ConsiderationItem[]"},
        { name: "orderType",     type: "uint8"              },
        { name: "startTime",     type: "uint256"            },
        { name: "endTime",       type: "uint256"            },
        { name: "zoneHash",      type: "bytes32"            },
        { name: "salt",          type: "uint256"            },
        { name: "conduitKey",    type: "bytes32"            },
        { name: "counter",       type: "uint256"            },
    ],
    OfferItem: [
        { name: "itemType",             type: "uint8"   },
        { name: "token",                type: "address" },
        { name: "identifierOrCriteria", type: "uint256" },
        { name: "startAmount",          type: "uint256" },
        { name: "endAmount",            type: "uint256" },
    ],
    ConsiderationItem: [
        { name: "itemType",             type: "uint8"   },
        { name: "token",                type: "address" },
        { name: "identifierOrCriteria", type: "uint256" },
        { name: "startAmount",          type: "uint256" },
        { name: "endAmount",            type: "uint256" },
        { name: "recipient",            type: "address" },
    ],
} as const;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface OrderBuildParams {
    offerer:       string;            // seller's wallet address
    tokenContract: string;
    tokenId:       string;
    tokenStandard: "ERC-721" | "ERC-1155";
    chain:         "ethereum" | "polygon";
    price:         string;            // human-readable amount, e.g. "1.5"
    paymentToken:  "ETH" | "WETH" | "USDC";
    duration:      number;            // listing duration in days (1–365)
    feeWallet:     string;            // CedarX fee recipient (empty = no fee split)
    feeBps:        number;            // fee in basis points, e.g. 150 = 1.5%
    counter:       number;            // offerer's current Seaport counter
}

export interface BuiltOrder {
    /** Deterministic CedarX asset ID derived from the token identifiers */
    assetId:                string;
    /** Full Seaport OrderComponents including counter — pass to EIP-712 sign */
    orderParameters:        Record<string, unknown>;
    /** Raw price in payment token base units (e.g. wei for ETH, 6-dec for USDC) */
    rawPrice:               string;
    paymentTokenAddress:    string;
    paymentTokenSymbol:     string;
    paymentTokenDecimals:   number;
    /** ISO timestamp when the listing expires */
    expiration:             string;
    /** EIP-712 domain for signing */
    domain:                 Record<string, unknown>;
    /** EIP-712 named types for signing */
    types:                  typeof SEAPORT_EIP712_TYPES;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Build unsigned Seaport OrderComponents for an agent listing.
 *
 * @param params  Order parameters supplied by the agent
 * @param assetId CedarX asset ID (derived by the caller from contract + tokenId)
 * @returns       Order parameters ready for EIP-712 signing + next-step hints
 */
export function buildSeaportOrder(
    params: OrderBuildParams,
    assetId: string
): BuiltOrder {
    const chainId = params.chain === "ethereum" ? 1 : 137;

    // Resolve payment token config
    const tokenConf = PAYMENT_TOKENS[params.chain]?.[params.paymentToken];
    if (!tokenConf) {
        throw new Error(
            `Unsupported payment token "${params.paymentToken}" on ${params.chain}. ` +
            `Supported: ${Object.keys(PAYMENT_TOKENS[params.chain] ?? {}).join(", ")}`
        );
    }

    // Parse human price → raw units (safe integer math via BigInt)
    const priceParts = params.price.split(".");
    const wholePart  = BigInt(priceParts[0] ?? "0");
    const fracString = (priceParts[1] ?? "").padEnd(tokenConf.decimals, "0").slice(0, tokenConf.decimals);
    const fracPart   = BigInt(fracString);
    const rawPrice   = wholePart * BigInt(10 ** tokenConf.decimals) + fracPart;

    if (rawPrice <= 0n) throw new Error(`Price must be greater than zero`);

    // Fee split: seller gets (1 − feeBps/10000), CedarX fee wallet gets feeBps/10000
    const feeAmount    = params.feeWallet
        ? rawPrice * BigInt(params.feeBps) / 10_000n
        : 0n;
    const sellerAmount = rawPrice - feeAmount;

    // Timestamps
    const nowSec  = Math.floor(Date.now() / 1000);
    const endTime = nowSec + params.duration * 86_400;

    // Cryptographically random salt (256 bits of entropy)
    const saltBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    );
    const salt = "0x" + saltBytes.join("");

    const nftItemType     = params.tokenStandard === "ERC-721" ? ITEM_TYPE.ERC721 : ITEM_TYPE.ERC1155;
    const paymentItemType = tokenConf.address === ZERO_ADDR    ? ITEM_TYPE.NATIVE : ITEM_TYPE.ERC20;

    const consideration: Record<string, unknown>[] = [
        {
            itemType:             paymentItemType,
            token:                tokenConf.address,
            identifierOrCriteria: "0",
            startAmount:          sellerAmount.toString(),
            endAmount:            sellerAmount.toString(),
            recipient:            params.offerer,
        },
    ];

    if (feeAmount > 0n && params.feeWallet) {
        consideration.push({
            itemType:             paymentItemType,
            token:                tokenConf.address,
            identifierOrCriteria: "0",
            startAmount:          feeAmount.toString(),
            endAmount:            feeAmount.toString(),
            recipient:            params.feeWallet,
        });
    }

    const orderParameters: Record<string, unknown> = {
        offerer:    params.offerer,
        zone:       ZERO_ADDR,
        offer: [{
            itemType:             nftItemType,
            token:                params.tokenContract,
            identifierOrCriteria: params.tokenId,
            startAmount:          "1",
            endAmount:            "1",
        }],
        consideration,
        orderType:                           ORDER_TYPE.FULL_OPEN,
        startTime:                           String(nowSec),
        endTime:                             String(endTime),
        zoneHash:                            ZERO_BYTES32,
        salt,
        conduitKey:                          ZERO_BYTES32,
        totalOriginalConsiderationItems:     consideration.length,
        counter:                             params.counter,
    };

    const domain = {
        name:             "Seaport",
        version:          "1.5",
        chainId,
        verifyingContract: SEAPORT_ADDRESS,
    };

    return {
        assetId,
        orderParameters,
        rawPrice:             rawPrice.toString(),
        paymentTokenAddress:  tokenConf.address,
        paymentTokenSymbol:   tokenConf.symbol,
        paymentTokenDecimals: tokenConf.decimals,
        expiration:           new Date(endTime * 1000).toISOString(),
        domain,
        types:                SEAPORT_EIP712_TYPES,
    };
}

/** List of valid payment tokens per chain — exported for use in route schemas */
export const VALID_PAYMENT_TOKENS: Record<string, string[]> = {
    ethereum: Object.keys(PAYMENT_TOKENS.ethereum ?? {}),
    polygon:  Object.keys(PAYMENT_TOKENS.polygon  ?? {}),
};
