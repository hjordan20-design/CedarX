# CedarX — Deployment Guide

This guide covers deploying CedarX end-to-end: database, smart contracts, indexer API (DigitalOcean), and frontend (Vercel).

---

## Architecture overview

```
Browser
  ↕ HTTPS
Vercel (apps/web)          ← Static React/Vite app
  ↕ REST API
DigitalOcean Droplet (apps/api)   ← Express server + background pollers
  ↕ Supabase PostgreSQL            ← Managed database
  ↕ Alchemy RPC                    ← Ethereum + Polygon node access
  ↕ Ethereum / Polygon             ← On-chain data + CedarX swap contract
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Runtime |
| pnpm | ≥ 9.0 | Package manager |
| Foundry | latest | Smart contract deployment |
| Git | any | Source control |

Accounts needed:
- **Supabase** (free tier works) — database
- **Alchemy** (free tier) — RPC for Ethereum + Polygon
- **DigitalOcean** — API server hosting
- **Vercel** — Frontend hosting
- **WalletConnect Cloud** — wallet connection (free)

---

## Step 1: Clone and install

```bash
git clone https://github.com/your-org/cedarx.git
cd cedarx
pnpm install
```

---

## Step 2: Supabase database

### 2a. Create a project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g. `cedarx-production`) and a strong database password
3. Select the region closest to your DigitalOcean droplet
4. Wait for the project to provision (~2 minutes)

### 2b. Run the schema

1. In your Supabase dashboard, go to **SQL Editor** → **New query**
2. Paste the full contents of `apps/api/src/db/schema.sql`
3. Click **Run**

This creates:
- `assets` table — indexed RWA NFTs
- `listings` table — active/sold/cancelled swap listings
- `trades` table — completed sales
- `indexer_cursors` table — per-poller resume state
- RLS policies — public read, service-role write

### 2c. Get your keys

Go to **Settings → API**:
- `SUPABASE_URL` — the project URL (e.g. `https://xyzabc.supabase.co`)
- `SUPABASE_SERVICE_KEY` — the **service_role** key (not the anon key). This bypasses RLS and must be kept server-side only.

### 2d. Migrating an existing database

If you are upgrading from a previous version that had Ondo/RealT data, run the migration statements at the bottom of `schema.sql` (the commented `ALTER TABLE` block) in the SQL editor. This:
- Updates `CHECK` constraints for new protocols and categories
- Renames `category = 'land'` → `'real-estate'` in existing Fabrica rows
- Removes stale Ondo/RealT rows (optional)
- Adds cursor rows for `4k` and `courtyard` pollers

---

## Step 3: Alchemy API key

1. Go to [alchemy.com](https://alchemy.com) → **Create app**
2. Select **Ethereum** as the primary network
3. Copy the **API Key** (one key works for Ethereum mainnet, Sepolia, and Polygon via Alchemy)

The indexer uses:
- `https://eth-mainnet.g.alchemy.com/v2/{KEY}` — Fabrica + 4K pollers
- `https://polygon-mainnet.g.alchemy.com/v2/{KEY}` — Courtyard poller
- `https://eth-sepolia.g.alchemy.com/v2/{KEY}` — testnet (optional)

Free tier limits: 300M compute units/month. With 3-minute polling intervals and 2000-block scan chunks, CedarX uses roughly 10–30M CUs/month depending on chain activity.

---

## Step 4: Smart contract deployment (Foundry)

The CedarX swap contract lives in `contracts/`. You can skip this step initially — all pollers run without a swap contract, they just won't index marketplace events.

### 4a. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 4b. Configure environment

```bash
cp contracts/.env.example contracts/.env
```

Edit `contracts/.env`:
```env
PRIVATE_KEY=0x...          # Deployer wallet private key
ETHERSCAN_API_KEY=...       # For contract verification
POLYGONSCAN_API_KEY=...     # For Polygon verification
ALCHEMY_API_KEY=...         # For RPC
```

### 4c. Deploy to Ethereum mainnet

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
  --broadcast \
  --verify \
  -vvvv
```

Take note of the deployed contract address. Verify it on [etherscan.io](https://etherscan.io).

### 4d. Deploy to Polygon (optional)

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://polygon-mainnet.g.alchemy.com/v2/$ALCHEMY_API_KEY \
  --broadcast \
  --verify \
  --verifier-url https://api.polygonscan.com/api \
  -vvvv
```

### 4e. Deploy to Sepolia (testnet)

```bash
forge script script/Deploy.s.sol \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/$ALCHEMY_API_KEY \
  --broadcast \
  -vvvv
```

---

## Step 5: Indexer API on DigitalOcean

### 5a. Create a Droplet

1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com) → **Droplets → Create**
2. Recommended: **Ubuntu 24.04 LTS**, **Basic plan**, **1 GB RAM / 1 vCPU** (~$6/month)
3. Add your SSH key
4. Create the droplet and note its IP address

### 5b. Initial server setup

```bash
# SSH into the droplet
ssh root@YOUR_DROPLET_IP

# Create a non-root user
adduser cedarx
usermod -aG sudo cedarx

# Install Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@9

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx
apt update && apt install -y nginx certbot python3-certbot-nginx
```

### 5c. Clone and build

```bash
su - cedarx
git clone https://github.com/your-org/cedarx.git
cd cedarx
pnpm install
pnpm --filter @cedarx/api build
```

### 5d. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env
```

Fill in:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
ALCHEMY_API_KEY=your-alchemy-key
CHAIN_ENV=mainnet
CEDARX_SWAP_CONTRACT_ADDRESS=0x...   # from Step 4c
CEDARX_SWAP_POLYGON_ADDRESS=0x...    # from Step 4d (if deployed)
PORT=3001
CORS_ORIGINS=https://cedarx.io
POLL_INTERVAL_MS=180000
BLOCKS_PER_SCAN=2000
```

### 5e. Start with PM2

```bash
cd ~/cedarx/apps/api

# Start the indexer
pm2 start dist/index.js --name cedarx-api

# Save PM2 config so it restarts on reboot
pm2 save
pm2 startup   # follow the printed instruction to enable on boot
```

Check logs:
```bash
pm2 logs cedarx-api
pm2 monit
```

### 5f. Nginx reverse proxy

```bash
sudo nano /etc/nginx/sites-available/cedarx-api
```

Paste:
```nginx
server {
    listen 80;
    server_name api.cedarx.io;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/cedarx-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5g. SSL with Certbot

Point your DNS `api.cedarx.io` A record to the droplet IP, then:

```bash
sudo certbot --nginx -d api.cedarx.io
```

Certbot auto-renews. Verify at `https://api.cedarx.io/health`.

### 5h. Verify the API

```bash
curl https://api.cedarx.io/health
curl https://api.cedarx.io/api/stats
curl "https://api.cedarx.io/api/assets?limit=5"
```

---

## Step 6: Frontend on Vercel

### 6a. Connect the repository

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `apps/web`
4. Framework: **Other** (Vite handles this)
5. Build command: `pnpm build`
6. Output directory: `dist`

### 6b. Environment variables

In Vercel project settings → **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.cedarx.io` |
| `VITE_ALCHEMY_API_KEY` | your Alchemy key |
| `VITE_WALLETCONNECT_PROJECT_ID` | from [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `VITE_CEDARX_SWAP_CONTRACT_ADDRESS` | Ethereum swap contract address |
| `VITE_CEDARX_SWAP_POLYGON_ADDRESS` | Polygon swap contract address (optional) |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |

### 6c. Deploy

Push to `main` branch. Vercel auto-deploys. The `vercel.json` at `apps/web/vercel.json` handles:
- SPA rewrites (all routes → `index.html`)
- Build command and output directory

---

## Step 7: Post-deployment verification

### Health checks

```bash
# API health
curl https://api.cedarx.io/health

# Market stats (should show non-zero assets after pollers catch up)
curl https://api.cedarx.io/api/stats | jq .

# Poller status (check PM2 logs for each poller's progress)
pm2 logs cedarx-api --lines 50
```

### First-run catch-up time

Pollers start from their `startBlock` and scan forward in 2000-block chunks. Estimated catch-up time on fresh install:

| Poller | Start block | Blocks to scan (~Mar 2026) | Est. time |
|--------|------------|---------------------------|-----------|
| Fabrica | 16,000,000 | ~4M blocks | ~2 hours |
| 4K | 16,800,000 | ~3.5M blocks | ~1.5 hours |
| Courtyard | 35,000,000 | ~2B Polygon blocks | ~8 hours |

Polygon blocks are produced every ~2 seconds, so there are ~800M blocks to scan since mid-2022. Increase `BLOCKS_PER_SCAN` to 10000 for faster initial catch-up (check your Alchemy plan's log limit first).

---

## Maintenance

### Updating the indexer

```bash
ssh cedarx@YOUR_DROPLET_IP
cd ~/cedarx
git pull origin main
pnpm install
pnpm --filter @cedarx/api build
pm2 restart cedarx-api
```

### Database backups

Supabase automatically backs up your database daily (free tier: 7-day retention). For additional safety, use `pg_dump`:

```bash
pg_dump "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" \
  > cedarx-backup-$(date +%Y%m%d).sql
```

### Monitoring

```bash
# Real-time PM2 monitor
pm2 monit

# View indexer logs with timestamps
pm2 logs cedarx-api --timestamp

# Check disk usage (IPFS cache can grow)
df -h
```

### Scaling

For higher throughput:
- **Alchemy Growth plan** — higher compute units and log limits (allows `BLOCKS_PER_SCAN=10000`)
- **2 GB RAM Droplet** — if the Node.js process grows with large asset sets
- **Read replicas** — Supabase Pro plan supports read replicas for high-traffic APIs

---

## Environment variable reference

### `apps/api/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✓ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✓ | Supabase service-role key |
| `ALCHEMY_API_KEY` | ✓ | Alchemy API key |
| `CHAIN_ENV` | | `mainnet` or `sepolia` (default: `mainnet`) |
| `POLYGON_RPC_URL` | | Override Polygon RPC (default: Alchemy Polygon) |
| `CEDARX_SWAP_CONTRACT_ADDRESS` | | Ethereum swap contract |
| `CEDARX_SWAP_POLYGON_ADDRESS` | | Polygon swap contract |
| `FABRICA_CONTRACT_ADDRESS` | | Override Fabrica contract |
| `FOURTK_CONTRACT_ADDRESS` | | Override 4K contract |
| `COURTYARD_CONTRACT_ADDRESS` | | Override Courtyard contract |
| `POLL_INTERVAL_MS` | | Poller interval in ms (default: `180000`) |
| `BLOCKS_PER_SCAN` | | Blocks per chunk (default: `2000`) |
| `PORT` | | API port (default: `3001`) |
| `CORS_ORIGINS` | | Comma-separated allowed origins |

### `apps/web/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✓ | Indexer API base URL |
| `VITE_ALCHEMY_API_KEY` | ✓ | Alchemy key (frontend RPC) |
| `VITE_WALLETCONNECT_PROJECT_ID` | ✓ | WalletConnect Cloud project ID |
| `VITE_CEDARX_SWAP_CONTRACT_ADDRESS` | | Ethereum swap contract |
| `VITE_CEDARX_SWAP_POLYGON_ADDRESS` | | Polygon swap contract |
| `VITE_USDC_ADDRESS` | | Override Ethereum USDC address |
| `ENABLE_EXPERIMENTAL_COREPACK` | | Set to `1` on Vercel for pnpm 9 |
