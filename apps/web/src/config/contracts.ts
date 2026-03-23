// ─── CedarX swap contract ────────────────────────────────────────────────────
// Ethereum mainnet swap contract address
export const CEDARX_SWAP_ADDRESS = (
  import.meta.env.VITE_CEDARX_SWAP_CONTRACT_ADDRESS || ""
) as `0x${string}`;

// Polygon swap contract address (separate deployment)
export const CEDARX_SWAP_POLYGON_ADDRESS = (
  import.meta.env.VITE_CEDARX_SWAP_POLYGON_ADDRESS || ""
) as `0x${string}`;

/** Returns the correct swap contract address for the given chain ID */
export function swapContractForChain(chainId: number): `0x${string}` {
  return chainId === 137 ? CEDARX_SWAP_POLYGON_ADDRESS : CEDARX_SWAP_ADDRESS;
}

// ─── USDC ────────────────────────────────────────────────────────────────────

/** USDC on Ethereum mainnet */
export const USDC_MAINNET = (
  import.meta.env.VITE_USDC_ADDRESS ||
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
) as `0x${string}`;

/** USDC on Polygon (native USDC via Circle CCTP bridge) */
export const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`;

/** Returns the correct USDC address for the given chain ID */
export function usdcForChain(chainId: number): `0x${string}` {
  return chainId === 137 ? USDC_POLYGON : USDC_MAINNET;
}

// Backwards-compat default (Ethereum USDC)
export const USDC_ADDRESS = USDC_MAINNET;
export const USDC_DECIMALS = 6;

// ─── Seaport v1.5 ────────────────────────────────────────────────────────────

/** Seaport 1.5 — same address on Ethereum and Polygon */
export const SEAPORT_ADDRESS = "0x00000000000000ADc04C56Bf30aC9d3c0aAF14dC" as `0x${string}`;

/** Well-known WETH on Ethereum mainnet */
export const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as `0x${string}`;

/** Native ETH sentinel used by Seaport */
export const NATIVE_TOKEN = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// Seaport item types
export const SEAPORT_ITEM_TYPE = {
  NATIVE:  0,
  ERC20:   1,
  ERC721:  2,
  ERC1155: 3,
} as const;

// Seaport order types
export const SEAPORT_ORDER_TYPE = {
  FULL_OPEN:        0,
  PARTIAL_OPEN:     1,
  FULL_RESTRICTED:  2,
  PARTIAL_RESTRICTED: 3,
} as const;

// ABI components reused inside fulfillOrder and createOrder
const OFFER_ITEM_COMPONENTS = [
  { name: "itemType",               type: "uint8"   },
  { name: "token",                  type: "address" },
  { name: "identifierOrCriteria",   type: "uint256" },
  { name: "startAmount",            type: "uint256" },
  { name: "endAmount",              type: "uint256" },
] as const;

const CONSIDERATION_ITEM_COMPONENTS = [
  ...OFFER_ITEM_COMPONENTS,
  { name: "recipient", type: "address" },
] as const;

const ORDER_PARAMETERS_COMPONENTS = [
  { name: "offerer",                          type: "address"  },
  { name: "zone",                             type: "address"  },
  { name: "offer",                            type: "tuple[]", components: OFFER_ITEM_COMPONENTS },
  { name: "consideration",                    type: "tuple[]", components: CONSIDERATION_ITEM_COMPONENTS },
  { name: "orderType",                        type: "uint8"    },
  { name: "startTime",                        type: "uint256"  },
  { name: "endTime",                          type: "uint256"  },
  { name: "zoneHash",                         type: "bytes32"  },
  { name: "salt",                             type: "uint256"  },
  { name: "conduitKey",                       type: "bytes32"  },
  { name: "totalOriginalConsiderationItems",  type: "uint256"  },
] as const;

export const SEAPORT_ABI = [
  // fulfillOrder — general fulfillment for any order type
  {
    type: "function",
    name: "fulfillOrder",
    stateMutability: "payable",
    inputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          { name: "parameters", type: "tuple", components: ORDER_PARAMETERS_COMPONENTS },
          { name: "signature",  type: "bytes"  },
        ],
      },
      { name: "fulfillerConduitKey", type: "bytes32" },
    ],
    outputs: [{ name: "fulfilled", type: "bool" }],
  },
  // getCounter — needed when creating orders (EIP-712 signature)
  {
    type: "function",
    name: "getCounter",
    stateMutability: "view",
    inputs: [{ name: "offerer", type: "address" }],
    outputs: [{ name: "counter", type: "uint256" }],
  },
] as const;

// EIP-712 types for signing a Seaport order off-chain
export const SEAPORT_EIP712_TYPES = {
  OrderComponents: [
    { name: "offerer",      type: "address"   },
    { name: "zone",         type: "address"   },
    { name: "offer",        type: "OfferItem[]" },
    { name: "consideration",type: "ConsiderationItem[]" },
    { name: "orderType",    type: "uint8"     },
    { name: "startTime",    type: "uint256"   },
    { name: "endTime",      type: "uint256"   },
    { name: "zoneHash",     type: "bytes32"   },
    { name: "salt",         type: "uint256"   },
    { name: "conduitKey",   type: "bytes32"   },
    { name: "counter",      type: "uint256"   },
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

// ─── CedarX swap ABI (subset used by the frontend) ───────────────────────────

export const CEDARX_SWAP_ABI = [
  // list(tokenContract, tokenId, quantity, askingPrice, standard) → listingId
  {
    type: "function",
    name: "list",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenContract", type: "address" },
      { name: "tokenId",       type: "uint256" },
      { name: "quantity",      type: "uint256" },
      { name: "askingPrice",   type: "uint256" },
      { name: "standard",      type: "uint8"   },
    ],
    outputs: [{ name: "listingId", type: "uint256" }],
  },
  // buy(listingId)
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  // cancel(listingId)
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [],
  },
  // getListing(listingId) → Listing struct
  {
    type: "function",
    name: "getListing",
    stateMutability: "view",
    inputs: [{ name: "listingId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "seller",        type: "address" },
          { name: "tokenContract", type: "address" },
          { name: "tokenId",       type: "uint256" },
          { name: "quantity",      type: "uint256" },
          { name: "askingPrice",   type: "uint256" },
          { name: "standard",      type: "uint8"   },
          { name: "active",        type: "bool"    },
        ],
      },
    ],
  },
  // feeBps() → uint256
  {
    type: "function",
    name: "feeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;
