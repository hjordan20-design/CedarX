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
