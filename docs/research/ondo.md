# Ondo Finance Protocol Research

**Website:** https://ondo.finance
**Asset Class:** US Treasury Bonds / Money Market Funds
**Token Standard:** ERC-20
**Chain(s):** Ethereum Mainnet (chain ID 1)

---

## Overview

Ondo Finance issues permissioned ERC-20 tokens that are 1:1 backed by
institutional-grade fixed-income assets (US Treasuries, money market funds).
Tokens are available to KYC-verified investors (OUSG) or permissionlessly
(USDY). NAV is updated daily on-chain by Ondo's oracle.

---

## Tokens

### OUSG — Ondo US Government Bond Fund
- **Address:** `0x1b19c19393e2d034d8ff31ff34c81252fcbbee92`
- **Underlying:** BlackRock's iShares Short Treasury Bond ETF (SHV)
- **KYC required:** Yes (on-chain allowlist)
- **Min investment:** $100,000 USD
- **Yield:** ~5% APY (T-bill rate, varies)

### rOUSG — Rebasing OUSG
- **Address:** `0x6e9a65d98474f1c68406e2fe02695fe5a3e7cb0d`
- **Description:** Rebasing wrapper for OUSG; balance increases daily instead
  of price increase. Useful for DeFi integrations.
- **KYC required:** Yes (same allowlist as OUSG)

### USDY — Ondo US Dollar Yield
- **Address:** `0x96f6ef951840721adbf46ac996b59e0235cb985c`
- **Underlying:** Short-term US Treasuries + bank demand deposits
- **KYC required:** No (permissionless, available globally except US/sanctioned)
- **Min investment:** $500 USD
- **Yield:** ~5% APY

---

## Price Oracle

Ondo uses an EOA-controlled oracle to update the NAV daily.

| Contract | Address |
|----------|---------|
| OUSG Price Oracle | `0xbbe2a8daf60de44f5a96f15a4b5b5c3c5b3e68f` |

Key ABI:
```solidity
function getOUSGPrice() external view returns (uint256 price);
// Returns price in 18-decimal fixed point (e.g., 1.05e18 = $1.05/token)
```

---

## Transfer Restrictions

OUSG and rOUSG use an on-chain `KYCSanctionsList` contract. Transfers are
blocked unless both sender and receiver are on the KYC allowlist.

```solidity
// From OUSG source
function _beforeTokenTransfer(address from, address to, uint256 amount)
  internal override {
  require(
    _kycRegistry.isKYCVerified(kycRequirementGroup, from) &&
    _kycRegistry.isKYCVerified(kycRequirementGroup, to),
    "OUSG: Transfer restricted"
  );
}
```

USDY has no transfer restrictions.

---

## On-Chain Data

There is no `tokenURI` for ERC-20 tokens. Asset metadata is static/documented:

| Field | OUSG | USDY |
|-------|------|------|
| Underlying | SHV ETF (US T-bills) | US Treasuries + bank deposits |
| Custodian | Bank of New York Mellon | Various |
| Fund Admin | NAV Consulting | - |
| Decimals | 18 | 18 |
| Yield Source | T-bill yield | T-bill + bank yield |

---

## CedarX Integration Notes

- Asset type: `"treasury-bond"` for OUSG/rOUSG, `"money-market-fund"` for USDY
- Valuation source: `"oracle"` — read from on-chain price oracle daily
- No subgraph — use direct RPC calls to query balances and prices
- Yield data should be fetched from Ondo's public API docs or off-chain config
- Display KYC badge on OUSG/rOUSG cards in the explore page
