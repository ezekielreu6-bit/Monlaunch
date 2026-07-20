# 🚀 MonLaunch

> Fair-launch meme token platform on **Monad Testnet** — inspired by pump.fun / bags.fm.

Anyone can create a token in seconds. It launches on an on-chain bonding curve immediately — no pre-sale, no VC allocation, no rugs. Once 10 MON is raised, the token graduates to a DEX.

---

## ✨ Features

- **Token launcher** — Create a meme token with name, symbol, image (IPFS), and description
- **Bonding curve** — Constant-product AMM (x·y = k), starting price ≈ 0.000000001073 MON
- **Buy / Sell** — Trade any token directly in the browser; 1% fee on every trade
- **Graduation** — Tokens that raise 10 MON move off the curve to a DEX
- **Trade history** — Live feed of buys/sells per token
- **Comments** — On-token discussion threads (off-chain, stored in PostgreSQL)
- **Leaderboard** — Top tokens ranked by trading volume
- **Wallet connection** — RainbowKit with MetaMask, Coinbase Wallet, WalletConnect
- **IPFS metadata** — Token images and metadata pinned on IPFS via Pinata

---

## 🏗 Architecture

```
monlaunch/          — Next.js 14 (App Router) frontend + API routes
contracts/          — Solidity smart contracts (Hardhat)
lib/                — Shared TypeScript libraries
```

### Smart Contracts

| Contract | Address (Monad Testnet) |
|---|---|
| `MemeFactory` | `0xEA2530C202BcDc14bF57277137A3802e19705D7e` |

### Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Wallet | wagmi v2, viem, RainbowKit v2 |
| Auth | NextAuth.js v4 + SIWE (Sign In With Ethereum) |
| Database | PostgreSQL + Drizzle ORM |
| Storage | IPFS via Pinata |
| Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin |
| Chain | Monad Testnet (chainId: 10143) |

---

## 🔧 Local Development

### 1. Clone & install

```bash
git clone https://github.com/ezekielreu6-bit/monlaunch
cd monlaunch
pnpm install        # install monorepo deps
cd monlaunch && npm install   # install Next.js app deps
```

### 2. Configure environment

```bash
cp monlaunch/.env.example monlaunch/.env.local
```

Fill in all values in `.env.local` (see table below).

### 3. Set up the database

```bash
cd monlaunch
npm run db:push     # creates tables in your PostgreSQL database
```

### 4. Run the dev server

```bash
cd monlaunch
npm run dev         # http://localhost:3000
```

---

## 🌍 Environment Variables

Copy `monlaunch/.env.example` → `monlaunch/.env.local` and fill in:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app) |
| `NEXTAUTH_SECRET` | Random string for JWT signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL (http://localhost:3000 in dev) | — |
| `PINATA_JWT` | Pinata API JWT for IPFS uploads | [pinata.cloud](https://pinata.cloud) |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Your Pinata gateway URL | pinata.cloud dashboard |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect v2 project ID | [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed MemeFactory address | Already set: `0xEA2530C202BcDc14bF57277137A3802e19705D7e` |
| `NEXT_PUBLIC_CHAIN_ID` | `10143` | — |
| `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc.monad.xyz` | — |
| `NEXT_PUBLIC_EXPLORER_URL` | `https://testnet.monadexplorer.com` | — |

---

## 🚢 Deploy to Vercel

1. **Push to GitHub** (`.env.local` is gitignored — never committed)

2. **Import project on Vercel**
   - Root directory: `monlaunch/`
   - Framework: Next.js (auto-detected)

3. **Add environment variables** in Vercel project settings (same as `.env.example`)

4. **Add a PostgreSQL database**
   - Vercel → Storage → Create Database (Postgres powered by Neon)
   - Or connect Neon / Supabase and paste `DATABASE_URL`

5. **Run migrations** (first deploy only)
   ```bash
   cd monlaunch && DATABASE_URL=<your-prod-url> npm run db:push
   ```

---

## 📜 Smart Contracts

### Bonding Curve

```
x · y = k
x = MON reserve (virtual 1.073 MON + net buys)
y = token reserve remaining in curve

Buy:  tokensOut = tokenReserve × monIn  / (monReserve + monIn)
Sell: monOut    = monReserve  × tokenIn / (tokenReserve + tokenIn)
```

| Parameter | Value |
|---|---|
| Total supply per token | 1,000,000,000 tokens |
| Virtual MON reserve | 1.073 MON |
| Graduation threshold | 10 MON raised |
| Trade fee | 1% |
| Creation fee | 0.01 MON |

### Contract Commands

```bash
cd contracts

# Compile
pnpm compile

# Test
pnpm test

# Deploy to Monad Testnet
pnpm deploy:monad-testnet

# Set creation fee (owner only)
pnpm set-fee:monad-testnet
```

### Monad Testnet

| | |
|---|---|
| Chain ID | 10143 |
| RPC | https://testnet-rpc.monad.xyz |
| Explorer | https://testnet.monadexplorer.com |
| Faucet | https://faucet.monad.xyz |

---

## 📁 Project Structure

```
monlaunch/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── page.tsx            # Home / Explore
│   │   ├── create/page.tsx     # Token creation form
│   │   ├── token/[address]/    # Token detail (buy/sell/comments)
│   │   ├── leaderboard/        # Volume leaderboard
│   │   └── api/                # REST API endpoints
│   ├── components/             # React components
│   ├── lib/
│   │   ├── wagmi.ts            # wagmi + RainbowKit config
│   │   ├── chains.ts           # Monad testnet chain definition
│   │   ├── contracts.ts        # ABI + contract addresses
│   │   ├── db.ts               # Drizzle + pg connection
│   │   ├── schema.ts           # Database schema
│   │   ├── pinata.ts           # IPFS upload helpers
│   │   └── auth.ts             # NextAuth + SIWE config
│   └── types/
contracts/
├── contracts/
│   ├── MemeToken.sol           # ERC-20 per token
│   └── MemeFactory.sol         # Bonding curve factory
├── scripts/
│   ├── deploy.ts
│   └── setCreationFee.ts
└── deployments/
    ├── monadTestnet.json       # Deployed addresses
    └── abi/                    # Contract ABIs (public)
```

---

## 🔒 Security

- Private keys: **never** committed — use `.env.local` (gitignored)
- Contract owner functions: `setCreationFee`, `withdrawFees`, `transferOwnership` — owner-only
- Comments: wallet address required (no bot spam without gas)
- IPFS uploads: server-side only (Pinata JWT never exposed to client)

---
## Connect with me 🌐

<p align="center">
  <a href="https://instagram.com/ezekielreu6" target="_blank">
    <img src="https://img.shields.io/badge/Instagram-%40ezekielreu6-E4405F?style=for-the-badge&logo=instagram&logoColor=white" />
  </a>
  <a href="https://twitter.com/ezekielreu6" target="_blank">
    <img src="https://img.shields.io/badge/Twitter-%40ezekielreu6-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" />
  </a>
  <a href="https://linkedin.com/in/ezekielreu6" target="_blank">
    <img src="https://img.shields.io/badge/LinkedIn-ezekielreu6-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" />
  </a>
  <a href="https://github.com/ezekielreu6-bit" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-ezekielreu6-bit-181717?style=for-the-badge&logo=github&logoColor=white" />
  </a>
  
  <a href="https://tiktok.com/@ezekielreu6" target="_blank">
    <img src="https://img.shields.io/badge/TikTok-%40ezekielreu6-000000?style=for-the-badge&logo=tiktok&logoColor=white" />
  </a>
</p>

### Follow me
I post about coding, design, and life updates. Tap any link above and say hi 👋

---

## 📄 License

MIT — feel free to fork and deploy your own instance.
