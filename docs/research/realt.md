# RealT Protocol Research

**Website:** https://realt.co
**Asset Class:** Residential Real Estate (US)
**Token Standard:** ERC-20 (one token per property)
**Chain(s):** Ethereum Mainnet (chain ID 1), Gnosis Chain (chain ID 100)

---

## Overview

RealT fractionalizes US residential properties by issuing one ERC-20 token
per property. Each property has a fixed token supply (e.g. 100 tokens = 100%
of the property). Token holders receive proportional rental income in USDC
(Ethereum) or xDAI (Gnosis Chain) distributed weekly.

As of 2024, RealT has tokenized 400+ properties primarily in Detroit, MI and
Chicago, IL with a combined value exceeding $50M.

---

## Token Architecture

Unlike Fabrica (one NFT = one property) or Ondo (one ERC-20 = one fund),
RealT deploys **a separate ERC-20 contract for each property**. This means:
- Hundreds of token addresses exist
- There is no single on-chain registry contract
- The authoritative list is RealT's off-chain API

### Token naming convention
```
REALTOKEN-S-11201-ALBANY-AVE-DETROIT-MI-48202
```

### Standard ERC-20 fields
| Field | Value |
|-------|-------|
| decimals | 18 |
| totalSupply | Fixed at deployment (e.g. 10000e18 for 10,000 tokens) |
| name | `"RealToken S 11201 Albany Ave Detroit MI 48202"` |
| symbol | `"REALTOKEN-S-11201-ALBANY-AVE-DETROIT-MI-48202"` |

---

## Infrastructure Contracts

RealT uses the Arbitrary Message Bridge (AMB) to bridge tokens between
Ethereum and Gnosis Chain. Rent distributions happen on Gnosis Chain.

| Contract | Address | Chain |
|----------|---------|-------|
| Token Mediator (ETH side) | `0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb` | Ethereum (1) |
| Token Mediator (Gnosis side) | `0xf9c3bcbab3b6e4f21b31e9b6e66bdbc6baad3cdb` | Gnosis (100) |

> **Quality gate:** These mediator addresses are the whitelist sentinels that
> activate the RealT adapter. The adapter then fetches the live property token
> list from the RealT API to build its own sub-whitelist. Only addresses
> returned by the RealT API are indexed.

---

## RealT Community API

**Base URL:** `https://api.realt.community`

No API key required for public endpoints.

### GET /v1/token
Returns the full list of active property tokens.

**Response shape (per token):**
```json
{
  "fullName": "RealToken S 11201 Albany Ave Detroit MI 48202",
  "shortName": "REALTOKEN-S-11201-ALBANY-AVE-DETROIT-MI-48202",
  "ethereumContract": "0xabc123...",
  "gnosisContract": "0xdef456...",
  "tokenPrice": 52.50,
  "totalTokens": 10000,
  "totalValue": 525000,
  "annualPercentageYield": 9.14,
  "netRentMonthPerToken": 0.40,
  "rentedUnits": 3,
  "totalUnits": 4,
  "propertyType": 1,
  "coordinate": { "lat": "42.3869", "lng": "-83.1554" },
  "imageLink": ["https://..."],
  "squareFeet": 1200,
  "bedroomBath": "3/1",
  "constructionYear": 1950,
  "fullAddress": "11201 Albany Ave, Detroit, MI 48202",
  "city": "Detroit",
  "state": "MI",
  "postalCode": "48202",
  "country": "USA"
}
```

**Property type codes:**
| Code | Type |
|------|------|
| 1 | Single Family Residence |
| 2 | Multi-family |
| 3 | Duplex |
| 4 | Condominium |
| 6 | Mixed-use |
| 8 | Commercial |
| 9 | SFR Portfolio |

---

## The Graph Subgraph

**Gnosis Chain:** `https://api.thegraph.com/subgraphs/name/real-token-com/realtoken-xdai`

Sample query for rent distributions:
```graphql
{
  rentDistributions(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    token { id symbol }
    amount
    timestamp
  }
}
```

---

## Rental Yield Distribution

1. RealT collects rent from tenants monthly
2. Distributes in xDAI on Gnosis Chain each Tuesday
3. Distribution contract calls `transfer(holder, amount)` for each token holder
4. Ethereum holders must bridge their tokens to Gnosis to receive xDAI rent
5. USDC distributions on Ethereum are available for large properties

---

## CedarX Integration Notes

- Asset type: map `propertyType` code to CedarX `AssetType`
- Valuation source: `"api"` — use `tokenPrice` from RealT API
- Yield: `annualPercentageYield` from API
- The adapter must fetch `/v1/token` and use the returned token list as the
  sub-whitelist — never index a RealT address that isn't on the list
- Both `ethereumContract` and `gnosisContract` addresses should be indexed
- Display occupancy rate (`rentedUnits / totalUnits`) on asset cards
