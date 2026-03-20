import type { ContractRef } from "@cedarx/shared-types";

/**
 * Ondo Finance issues permissioned ERC-20 tokens backed by institutional
 * fixed-income instruments (US Treasuries, money-market funds). Transfers are
 * gated by an on-chain KYC allowlist controlled by Ondo. NAV is updated daily
 * by Ondo's oracle EOA and can be read via the `getOUSGPrice()` / `getPrice()`
 * view functions on each token contract.
 *
 * See docs/research/ondo.md for full protocol details.
 */
export const ONDO_CONTRACTS = {
  /** OUSG — Ondo US Government Bond Fund (ERC-20, KYC-gated) */
  OUSG: {
    address: "0x1b19c19393e2d034d8ff31ff34c81252fcbbee92" as `0x${string}`,
    chainId: 1,
    deployedBlock: 16_520_000,
    name: "OUSG",
  },
  /** rOUSG — Rebasing wrapper for OUSG (permissionless balance accrual) */
  ROUSG: {
    address: "0x6e9a65d98474f1c68406e2fe02695fe5a3e7cb0d" as `0x${string}`,
    chainId: 1,
    deployedBlock: 18_000_000,
    name: "rOUSG",
  },
  /** USDY — Ondo US Dollar Yield (permissionless, collateralized by T-bills) */
  USDY: {
    address: "0x96f6ef951840721adbf46ac996b59e0235cb985c" as `0x${string}`,
    chainId: 1,
    deployedBlock: 17_400_000,
    name: "USDY",
  },
  /** OUSG price oracle — read `getOUSGPrice()` for current NAV per token */
  OUSG_ORACLE: {
    address: "0xbbe2a8daf60de44f5a96f15a4b5b5c3c5b3e68f" as `0x${string}`,
    chainId: 1,
    deployedBlock: 16_520_000,
    name: "OUSGPriceOracle",
  },
} as const satisfies Record<string, ContractRef>;

export const ONDO_CONTRACT_LIST: ContractRef[] = Object.values(ONDO_CONTRACTS);

/** Tokens that represent investable assets (exclude infrastructure contracts) */
export const ONDO_TOKEN_ADDRESSES: ReadonlyArray<`0x${string}`> = [
  ONDO_CONTRACTS.OUSG.address,
  ONDO_CONTRACTS.ROUSG.address,
  ONDO_CONTRACTS.USDY.address,
];
