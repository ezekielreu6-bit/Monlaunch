import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tokens, trades, comments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { publicClient } from "@/lib/viem-server";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";
import {
  ipfsToHttp,
  shortAddress,
  formatPrice,
  timeAgo,
  calcSpotPrice,
  calcMarketCap,
} from "@/lib/utils";
import BuySellPanel from "@/components/BuySellPanel";
import BondingCurveProgress from "@/components/BondingCurveProgress";
import CommentSection from "@/components/CommentSection";
import TradeHistory from "@/components/TradeHistory";
import TokenLiveStats from "@/components/TokenLiveStats";
import { ExternalLink } from "lucide-react";

interface Props { params: { address: string } }

async function getTokenData(address: string) {
  const addr = address.toLowerCase();
  const dbToken = await db
    .select()
    .from(tokens)
    .where(eq(tokens.address, addr))
    .limit(1)
    .then((r) => r[0] ?? null)
    .catch(() => null);

  let chainData = null;
  try {
    const data = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: MEME_FACTORY_ABI,
      functionName: "tokens",
      args: [address as `0x${string}`],
    });
    if (data && data[0] !== "0x0000000000000000000000000000000000000000") {
      chainData = {
        monReserve:    data[5],
        tokenReserve:  data[6],
        realMonRaised: data[7],
        graduated:     data[8],
      };
    }
  } catch { /* chain read failed — fall back to DB */ }

  if (!dbToken && !chainData) return null;
  return { dbToken, chainData };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getTokenData(params.address).catch(() => null);
  if (!data?.dbToken) return { title: "Token — MonLaunch" };
  const t = data.dbToken;
  return {
    title: `$${t.symbol} / ${t.name} — MonLaunch`,
    description: t.description || `Buy and sell $${t.symbol} on MonLaunch`,
    openGraph: {
      title: `$${t.symbol} on MonLaunch`,
      description: t.description || `Trade $${t.symbol} on Monad Testnet`,
      images: t.imageUrl ? [ipfsToHttp(t.imageUrl)] : [],
    },
  };
}

export default async function TokenPage({ params }: Props) {
  const address = params.address as `0x${string}`;

  const [tokenData, tokenTrades, tokenComments] = await Promise.all([
    getTokenData(address),
    db
      .select()
      .from(trades)
      .where(eq(trades.tokenAddress, address.toLowerCase()))
      .orderBy(desc(trades.createdAt))
      .limit(50)
      .catch(() => []),
    db
      .select()
      .from(comments)
      .where(eq(comments.tokenAddress, address.toLowerCase()))
      .orderBy(desc(comments.createdAt))
      .limit(100)
      .catch(() => []),
  ]);

  if (!tokenData) notFound();
  const { dbToken, chainData } = tokenData;

  const name        = dbToken?.name        ?? "Unknown";
  const symbol      = dbToken?.symbol      ?? "???";
  const description = dbToken?.description ?? "";
  const imageUrl    = dbToken?.imageUrl ? ipfsToHttp(dbToken.imageUrl) : null;
  const creator     = dbToken?.creator     ?? "";
  const createdAt   = dbToken?.createdAt   ?? new Date();
  const tradeCount  = dbToken?.tradeCount  ?? 0;

  const monReserve    = chainData?.monReserve    ?? BigInt(dbToken?.monReserve    ?? "0");
  const tokenReserve  = chainData?.tokenReserve  ?? BigInt(dbToken?.tokenReserve  ?? "0");
  const realMonRaised = chainData?.realMonRaised ?? BigInt(dbToken?.realMonRaised ?? "0");
  const graduated     = chainData?.graduated     ?? dbToken?.graduated ?? false;

  // Graduation progress (0–10 000 basis points)
  const GRADUATION_THRESHOLD = BigInt("10000000000000000000");
  const progress =
    realMonRaised > GRADUATION_THRESHOLD
      ? 10000n
      : (realMonRaised * 10000n) / GRADUATION_THRESHOLD;

  // Initial price values (will be refreshed live by TokenLiveStats)
  const initialSpotPrice = calcSpotPrice(monReserve, tokenReserve);
  const initialMarketCap = calcMarketCap(monReserve, tokenReserve);

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://testnet.monadexplorer.com";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-16 space-y-5">

      {/* ── Token header ── */}
      <div className="border border-border rounded-lg bg-surface p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start">

          {/* Image */}
          <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-2 border border-border shrink-0">
            {imageUrl ? (
              <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl font-black text-green/20">{symbol.slice(0, 2)}</span>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white">{name}</h1>
              <span className="px-2 py-0.5 rounded border border-border text-green mono text-sm font-bold">
                ${symbol}
              </span>
              {graduated && (
                <span className="px-2 py-0.5 rounded border border-green/30 bg-green/10 text-green text-[11px] font-bold mono">
                  ✓ GRADUATED
                </span>
              )}
            </div>

            {description && (
              <p className="text-text-secondary text-sm max-w-2xl">{description}</p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] mono text-text-muted">
              <span>
                created by{" "}
                <a
                  href={`${explorerUrl}/address/${creator}`}
                  target="_blank"
                  className="text-green hover:underline"
                >
                  {shortAddress(creator)}
                </a>
              </span>
              <span>·</span>
              <span>{timeAgo(createdAt)}</span>
              <span>·</span>
              <a
                href={`${explorerUrl}/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-green transition-colors"
              >
                {shortAddress(address)} <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Static price hint shown before JS hydrates */}
            <p className="text-[11px] mono text-text-muted sm:hidden">
              Price: {formatPrice(initialSpotPrice)} MON
            </p>
          </div>

          {/* ── Live stats panel (client component, self-polling) ── */}
          <TokenLiveStats
            tokenAddress={address}
            initialSpotPrice={initialSpotPrice}
            initialMarketCap={initialMarketCap}
            initialRaised={realMonRaised}
            initialTradeCount={tradeCount}
          />
        </div>
      </div>

      {/* ── Two column ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">

        {/* Left: trades + comments */}
        <div className="space-y-4 order-2 lg:order-1">
          <TradeHistory trades={tokenTrades} tokenSymbol={symbol} />
          <CommentSection
            tokenAddress={address.toLowerCase()}
            initialComments={tokenComments}
          />
        </div>

        {/* Right: buy/sell + live bonding curve */}
        <div className="space-y-4 order-1 lg:order-2">
          <BuySellPanel
            tokenAddress={address}
            tokenSymbol={symbol}
            graduated={graduated}
          />
          <BondingCurveProgress
            progress={progress}
            realMonRaised={realMonRaised}
            tokenAddress={address}
          />
        </div>
      </div>
    </div>
  );
}
