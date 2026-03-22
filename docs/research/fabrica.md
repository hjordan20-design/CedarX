# Fabrica Protocol Research

**Website:** https://fabrica.land
**Asset Class:** Real Estate (Land / Residential / Commercial)
**Token Standard:** ERC-721
**Chain(s):** Ethereum Mainnet (chain ID 1)

---

## Overview

Fabrica tokenizes real property deeds as ERC-721 NFTs on Ethereum. Each NFT
represents 100% ownership of a specific parcel of land identified by its APN
(Assessor's Parcel Number). The legal framework uses a Delaware Series LLC as
the holding entity: the property is conveyed to the LLC, and the NFT represents
membership interest in that LLC series.

Key value prop: on-chain settlement of property ownership with full legal
enforceability under US property law.

---

## Contract Addresses

| Contract | Address | Chain |
|----------|---------|-------|
| Fabrica Token V2 / FAB (ERC-721) | `0x1464e8659b9ab3811e0dcd601c401799f1e63f11` | Ethereum (1) |

> **Whitelist note:** Only the above contract is indexed by CedarX. Any ERC-721
> not from this address will be rejected by the quality gate even if it mimics
> the Fabrica metadata schema.

---

## Token Metadata

Token URI points to an IPFS-hosted JSON file following the OpenSea metadata
standard, extended with Fabrica-specific fields:

```json
{
  "name": "123 Main St, Springfield IL 62701",
  "description": "...",
  "image": "ipfs://Qm...",
  "external_url": "https://fabrica.land/property/...",
  "attributes": [
    { "trait_type": "APN", "value": "14-21-300-021" },
    { "trait_type": "State", "value": "IL" },
    { "trait_type": "County", "value": "Sangamon" },
    { "trait_type": "Lot Size (sqft)", "value": 7200, "display_type": "number" },
    { "trait_type": "Year Built", "value": 1952, "display_type": "number" }
  ],
  "apn": "14-21-300-021",
  "property_address": "123 Main St, Springfield, IL 62701",
  "deed_url": "ar://...",
  "title_insurance_url": "ar://...",
  "holding_entity": "Fabrica Series LLC — Parcel 14-21-300-021"
}
```

Key fields:
- **APN** — Assessor's Parcel Number, unique per parcel
- **deed_url** — Arweave URL for the recorded deed
- **title_insurance_url** — Arweave URL for title insurance policy
- **holding_entity** — Name of the Delaware Series LLC holding title

---

## On-Chain Data

The ERC-721 contract (`tokenURI(uint256 tokenId)`) returns the IPFS URI.
The APN is the canonical identifier stored in the token name/attributes.

No on-chain valuation oracle — valuations are manual / county assessor based.

---

## Querying

**The Graph subgraph:**
`https://api.thegraph.com/subgraphs/name/fabrica-land/fabrica-ethereum`

Sample query to list all minted tokens:
```graphql
{
  tokens(first: 100, orderBy: mintedAt, orderDirection: desc) {
    id
    tokenId
    owner
    tokenURI
    mintedAt
  }
}
```

---

## CedarX Integration Notes

- Asset type: `"land"` or `"single-family-home"` depending on `propertyType` attribute
- Token standard: ERC-721 (each token = one property, not fractionalized)
- No yield/rental income mechanism — pure ownership token
- Valuation source: `"manual"` (county assessor or appraisal)
- The adapter should read `tokenURI` for each minted token and parse the IPFS JSON
