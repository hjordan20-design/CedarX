// ─── RelayX Key contract ─────────────────────────────────────────────────────

export const RELAYX_KEY_ADDRESS = (
  import.meta.env.VITE_RELAYX_KEY_CONTRACT_ADDRESS || ""
) as `0x${string}`;

// ─── USDC ────────────────────────────────────────────────────────────────────

/** USDC on Ethereum mainnet */
export const USDC_MAINNET =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as `0x${string}`;

/** USDC on Sepolia testnet */
export const USDC_SEPOLIA = (
  import.meta.env.VITE_USDC_SEPOLIA_ADDRESS || ""
) as `0x${string}`;

export const USDC_DECIMALS = 6;

// ─── RelayX Key ABI (subset used by frontend) ───────────────────────────────

export const RELAYX_KEY_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "propertyId", type: "bytes32" },
      { name: "unit", type: "string" },
      { name: "startDate", type: "uint256" },
      { name: "endDate", type: "uint256" },
      { name: "priceUsdc", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ERC-20 approve ABI for USDC approval
export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
