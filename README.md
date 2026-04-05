# CedarX

The real asset marketplace — a platform for discovering, analyzing, and trading tokenized real-world assets (RWA) across multiple protocols.

## Overview

CedarX aggregates tokenized assets from leading RWA protocols:

| Protocol | Asset Type | Chain(s) | Token Standard |
|----------|-----------|----------|----------------|
| [Fabrica](https://fabrica.land) | Real Estate (Land/Property) | Ethereum | ERC-721 |
| [Ondo Finance](https://ondo.finance) | Treasury Bonds / Money Market | Ethereum | ERC-20 |
| [RealT](https://realt.co) | Residential Real Estate | Ethereum, Gnosis | ERC-20 (per property) |

## Monorepo Structure

```
CedarX/
├── apps/
│   ├── web/                  # Next.js frontend marketplace
│   └── api/                  # Backend API server
├── packages/
│   ├── shared-types/         # Shared TypeScript type definitions
│   ├── protocol-adapters/    # Adapters for Fabrica, Ondo, RealT
│   └── ui-components/        # Shared React UI components
├── docs/
│   └── research/             # Protocol research documents
│       ├── fabrica.md
│       ├── ondo.md
│       └── realt.md
├── scripts/                  # Build/deployment scripts
├── config/                   # Shared configuration
├── turbo.json                # Turborepo pipeline configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
└── tsconfig.base.json        # Base TypeScript config
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all packages in dev mode
pnpm dev

# Run a specific app
pnpm --filter @cedarx/api dev
pnpm --filter @cedarx/web dev
```

### Build

```bash
pnpm build
```

### Type Checking

```bash
pnpm type-check
```

## Architecture

### Package Graph

```
@cedarx/web ──────────────────────────────────┐
                                               ▼
@cedarx/api ──────► @cedarx/protocol-adapters ──► @cedarx/shared-types
                                               ▲
@cedarx/ui-components ─────────────────────────┘
```

### Protocol Adapters

Each protocol adapter implements the `ProtocolAdapter` interface:

```typescript
interface ProtocolAdapter {
  fetchAssets(): Promise<RWAsset[]>;
  fetchAsset(tokenAddress: string, tokenId?: string): Promise<RWAsset | null>;
  fetchValuation(tokenAddress: string, tokenId?: string): Promise<string | null>;
}
```

## Research

See [`docs/research/`](./docs/research/) for detailed protocol research:

- [Fabrica](./docs/research/fabrica.md) — ERC-721 tokenized land on Ethereum
- [Ondo Finance](./docs/research/ondo.md) — Tokenized US treasuries and money market funds
- [RealT](./docs/research/realt.md) — Fractional real estate via ERC-20 property tokens

## Sessions

| Session | Focus | Status |
|---------|-------|--------|
| 1 | Research + Monorepo Setup | ✅ In Progress |
| 2 | Protocol Adapters Implementation | 🔜 Planned |
| 3 | API Development | 🔜 Planned |
| 4 | Frontend Marketplace | 🔜 Planned |
| 5 | Testing + Deployment | 🔜 Planned |

