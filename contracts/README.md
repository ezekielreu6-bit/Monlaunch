# MonadMeme — Smart Contracts

Bonding-curve token launcher on **Monad Testnet**, inspired by bags.fm / pump.fun.

## Contracts

| Contract | Purpose |
|---|---|
| `MemeFactory` | Factory + bonding curve. Creates tokens, handles buy/sell with native MON, collects fees, triggers graduation. |
| `MemeToken` | Minimal ERC-20 deployed per token. All 1B tokens minted to `MemeFactory` on creation. |

## Bonding Curve

Uses a **constant-product AMM** (x·y = k) with virtual reserves:

```
x = MON reserve  (virtual 1.073 MON + net real buys)
y = token reserve remaining in curve
k = x · y  (constant)
```

| Action | Formula |
|---|---|
| Buy  | `tokensOut = tokenReserve × monIn / (monReserve + monIn)` |
| Sell | `monOut = monReserve × tokensIn / (tokenReserve + tokensIn)` |

- **Trade fee**: 1 % (100 bps) on every trade, paid to the factory owner
- **Graduation**: Once 10 MON of real liquidity is raised the token is marked *graduated* — bonding-curve trading stops and the raised MON can be seeded into a DEX
- **Starting price**: ≈ 0.000000001073 MON / token (extremely cheap at launch)

## Setup

```bash
cd contracts
cp .env.example .env
# Fill in PRIVATE_KEY with your Monad testnet wallet
pnpm install
```

Get testnet MON from the faucet: https://faucet.monad.xyz

## Commands

```bash
# Compile contracts
pnpm compile

# Run tests (against local Hardhat node)
pnpm test

# Deploy to Monad Testnet
pnpm deploy:monad-testnet
```

After deploying you'll see:

```
✓ MemeFactory deployed: 0x...
✓ Deployment info saved to: deployments/monadTestnet.json
✓ ABI exported: deployments/abi/MemeFactory.json
✓ ABI exported: deployments/abi/MemeToken.json

Next steps:
  1. Copy into your .env:
     NEXT_PUBLIC_FACTORY_ADDRESS=0x...
```

## Key Numbers (Testnet)

| Param | Value |
|---|---|
| Total supply per token | 1,000,000,000 tokens |
| Virtual MON reserve | 1.073 MON |
| Graduation threshold | 10 MON raised |
| Trade fee | 1 % |
| Creation fee | 0 MON (configurable by owner) |

## Frontend Integration

After deployment, you'll need:

- `NEXT_PUBLIC_FACTORY_ADDRESS` — the deployed `MemeFactory` address
- `deployments/abi/MemeFactory.json` — ABI for wagmi/viem
- `deployments/abi/MemeToken.json` — ABI for individual token interactions

Events to index for the frontend:

| Event | Use |
|---|---|
| `TokenCreated` | listings page, new token feed |
| `TokensBought` | trade history, price chart |
| `TokensSold` | trade history, price chart |
| `TokenGraduated` | graduation banner, filtered views |

## Network Info

| | |
|---|---|
| Network | Monad Testnet |
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |
| Faucet | https://faucet.monad.xyz |
