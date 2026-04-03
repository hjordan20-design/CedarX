# RelayX

**Keys to furnished rentals.**

A marketplace where landlords pre-sell future occupancy periods of furnished rental properties as tradeable ERC-721 Keys. Buyers browse properties, select a specific unit and period, pay with USDC, and receive a Key. Keys can be traded on secondary market or redeemed for physical occupancy.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (Vercel)
- **API:** Hono + TypeScript (DigitalOcean via PM2)
- **Database:** Supabase (PostgreSQL + PostgREST)
- **Smart Contract:** ERC-721 with period metadata (Ethereum / Sepolia)
- **Wallet:** RainbowKit + wagmi
- **Settlement:** USDC

## Project Structure

```
apps/
  web/          # React frontend (Vite + Tailwind)
  api/          # Hono API server
contracts/      # Solidity smart contracts (Foundry)
packages/
  shared-types/ # Shared TypeScript types
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start frontend + API in dev mode
pnpm dev

# Run database migrations
# Apply apps/api/src/db/schema.sql to your Supabase project
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3002
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALCHEMY_API_KEY=
VITE_WALLETCONNECT_PROJECT_ID=
```

### API (.env)
```
PORT=3002
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ALCHEMY_API_KEY=
```

## Deploy

- **Frontend:** Auto-deploys on push to `main` via Vercel
- **API:** `ssh root@server && cd /home/relayx && git pull && pnpm install && pm2 restart relayx`
- **Contract:** `forge script script/Deploy.s.sol:DeployRelayXKey --rpc-url $SEPOLIA_RPC_URL --broadcast`
