# CedarX Contracts

Solidity smart contracts for the CedarX marketplace. Built with [Foundry](https://book.getfoundry.sh/).

## Contracts

### `CedarXSwap.sol`

The core atomic swap contract. Enables peer-to-peer trading of tokenized real-world assets (ERC-721, ERC-1155, ERC-20) settled in USDC, with a configurable platform fee routed to the CedarX treasury.

**Security properties:**
- `ReentrancyGuard` on all state-changing functions
- Check-Effects-Interactions pattern throughout
- `Ownable2Step` (two-phase ownership transfer)
- `Pausable` emergency circuit-breaker
- `SafeERC20` for USDC transfers
- No proxy/delegatecall — simple, flat, auditable

## Getting Started

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Install dependencies

```bash
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-git
```

### Build

```bash
forge build
```

### Test

```bash
# Run all tests with verbose output
forge test -vv

# With gas report
forge test --gas-report

# Coverage report
forge coverage
```

## Deployment

### Sepolia testnet

```bash
cp .env.example .env
# Fill in your values in .env

source .env
forge script script/Deploy.s.sol:DeployCedarXSwap \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

### Ethereum mainnet

Mainnet deployment requires:
1. BC corp formed (operating entity)
2. Smart contract audit completed
3. Hardware wallet (Ledger) for owner/treasury
4. Gnosis Safe multisig as contract owner

```bash
forge script script/Deploy.s.sol:DeployCedarXSwap \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify \
  --ledger \
  --sender $CEDARX_OWNER \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

## Contract Addresses

| Network | Address | Status |
|---------|---------|--------|
| Sepolia | TBD | Pending deployment |
| Ethereum Mainnet | TBD | Pending audit |
