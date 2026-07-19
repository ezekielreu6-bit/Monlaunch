import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tokens, trades, comments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { publicClient } from "@/lib/viem-server";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";
import { ipfsToHttp, shortAddress, formatPrice, formatMarketCap, timeAgo } from "@/lib/utils";
import BuySellPanel from "@/components/BuySellPanel";
import BondingCurveProgress from "@/components/BondingCurveProgress";
import CommentSection from "@/components/CommentSection";
import TradeHistory from "@/components/TradeHistory";
import { ExternalLink, Copy } from "lucide-react";

interface Props {
  params: { address: string };
}

async function getTokenData(address: string) {
  const addr = address.toLowerCase();

  // Try DB first
  const dbToken = await db
    .select()
    .from(tokens)
    .where(eq(tokens.address, addr))
    .limit(1)
    .then((r) => r[0] ?? null)
    .catch(() => null);

  // Fetch live chain data
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
        monReserve: data[5],
        tokenReserve: data[6],
        realMonRaised: data[7],
        graduated: data[8],
      };
    }
  } catch { /* RPC may fail */ }

  if (!dbToken && !chainData) return null;

  return { dbToken, chainData };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getTokenData(params.address).catch(() => null);
  if (!data?.dbToken) return { title: "Token — MonLaunch" };
  return {
    title: `$${data.dbToken.symbol} — MonLaunch`,
    description: data.dbToken.description || `Trade $${data.dbToken.symbol} on MonLaunch`,
    openGraph: {
      title: `$${data.dbToken.symbol} on MonLaunch`,
      images: data.dbToken.imageUrl ? [ipfsToHttp(data.dbToken.imageUrl)] : [],
    },
  };
}

export default async function TokenPage({ params }: Props) {
  const address = params.address as `0x${string}`;

  const [tokenData, tokenTrades, tokenComments] = await Promise.all([
    getTokenData(address),
    db.select().from(trades).where(eq(trades.tokenAddress, address.toLowerCase())).orderBy(desc(trades.createdAt)).limit(50).catch(() => []),
    db.select().from(comments).where(eq(comments.tokenAddress, address.toLowerCase())).orderBy(desc(comments.createdAt)).limit(100).catch(() => []),
  ]);

  if (!tokenData) notFound();

  const { dbToken, chainData } = tokenData;

  const name = dbToken?.name ?? "Unknown Token";
  const symbol = dbToken?.symbol ?? "???";
  const description = dbToken?.description ?? "";
  const imageUrl = dbToken?.imageUrl ? ipfsToHttp(dbToken.imageUrl) : null;
  const creator = dbToken?.creator ?? "";
  const createdAt = dbToken?.createdAt ?? new Date();

  const monReserve = chainData?.monReserve ?? BigInt(dbToken?.monReserve ?? "0");
  const tokenReserve = chainData?.tokenReserve ?? BigInt(dbToken?.tokenReserve ?? "0");
  const realMonRaised = chainData?.realMonRaised ?? BigInt(dbToken?.realMonRaised ?? "0");
  const graduated = chainData?.graduated ?? dbToken?.graduated ?? false;

  // Compute progress (realMonRaised / 10 MON = graduation threshold)
  const GRADUATION_THRESHOLD = BigInt("10000000000000000000"); // 10 MON
  const progress = realMonRaised > GRADUATION_THRESHOLD
    ? 10000n
    : (realMonRaised * 10000n) / GRADUATION_THRESHOLD;

  // Spot price: monReserve / tokenReserve (both 18-decimal)
  const spotPriceRaw =
    tokenReserve > 0n ? (monReserve * BigInt(1e18)) / tokenReserve : 0n;

  const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Token header */}
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        {/* Image */}
        <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-surface-2 border border-border shrink-0">
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-black text-primary/30">{symbol.slice(0, 2)}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-text-primary">{name}</h1>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-surface-2 border border-border text-text-secondary">
              ${symbol}
            </span>
            {graduated && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-success/15 text-success border border-success/30">
                🎓 Graduated
              </span>
            )}
          </div>
          {description && (
            <p className="text-text-secondary text-sm max-w-xl">{description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-text-muted pt-1">
            <span>
              by{" "}
              <Link href={`${explorerUrl}/address/${creator}`} target="_blank" className="font-mono text-primary-light hover:underline">
                {shortAddress(creator)}
              </Link>
            </span>
            <span>·</span>
            <span>{timeAgo(createdAt)}</span>
            <span>·</span>
            <a
              href={`${explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-text-secondary transition-colors"
            >
              {shortAddress(address)} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 space-y-0.5">
          <p className="text-2xl font-black text-text-primary">
            {formatPrice(spotPriceRaw)} MON
          </p>
          <p className="text-xs text-text-muted">per token</p>
          <p className="text-sm font-semibold text-text-secondary">
            Mcap: {formatMarketCap(realMonRaised)}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left — trade history + comments */}
        <div className="space-y-6 order-2 lg:order-1">
          <TradeHistory trades={tokenTrades} tokenSymbol={symbol} />
          <CommentSection tokenAddress={address.toLowerCase()} initialComments={tokenComments} />
        </div>

        {/* Right — buy/sell + progress */}
        <div className="space-y-4 order-1 lg:order-2">
          <BuySellPanel
            tokenAddress={address}
            tokenSymbol={symbol}
            graduated={graduated}
          />
          <BondingCurveProgress
            progress={progress}
            realMonRaised={realMonRaised}
          />
        </div>
      </div>
    </div>
  );
}
