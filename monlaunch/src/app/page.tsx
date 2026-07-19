import Link from "next/link";
import { Suspense } from "react";
import { Rocket, TrendingUp, Zap, Users } from "lucide-react";
import TokenCard from "@/components/TokenCard";
import TokenFilters from "@/components/TokenFilters";
import { db } from "@/lib/db";
import { tokens } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { Token } from "@/lib/schema";

async function getTokens(tab: string): Promise<Token[]> {
  try {
    if (tab === "graduated") {
      return await db
        .select()
        .from(tokens)
        .where(eq(tokens.graduated, true))
        .orderBy(desc(tokens.totalVolumeMon))
        .limit(50);
    }
    if (tab === "trending") {
      return await db
        .select()
        .from(tokens)
        .orderBy(desc(tokens.tradeCount), desc(tokens.createdAt))
        .limit(50);
    }
    // default: new
    return await db
      .select()
      .from(tokens)
      .orderBy(desc(tokens.createdAt))
      .limit(50);
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [result] = await db
      .select({
        total: sql<number>`count(*)`,
        graduated: sql<number>`sum(case when graduated then 1 else 0 end)`,
        volume: sql<string>`coalesce(sum(total_volume_mon::numeric), 0)::text`,
      })
      .from(tokens);
    return result;
  } catch {
    return { total: 0, graduated: 0, volume: "0" };
  }
}

const STATS = [
  { label: "Tokens Launched", icon: Rocket, color: "text-primary-light", key: "total" },
  { label: "Graduated", icon: TrendingUp, color: "text-success", key: "graduated" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab = searchParams?.tab ?? "new";
  const [tokenList, stats] = await Promise.all([getTokens(tab), getStats()]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-hero-glow">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary-light text-xs font-semibold mb-2">
            <Zap className="w-3 h-3" />
            Built on Monad Testnet — Ultra-fast EVM
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gradient">
            Launch your token.<br />
            Let the curve decide.
          </h1>

          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Fair-launch meme tokens with a bonding curve. No pre-sale, no VC allocation.
            Anyone can buy from block one.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/create"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all hover:glow-purple text-sm"
            >
              <Rocket className="w-4 h-4" /> Launch a Token
            </Link>
            <Link
              href="#explore"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border hover:border-primary/50 text-text-secondary hover:text-text-primary font-semibold transition-all text-sm"
            >
              Explore Tokens
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 pt-4">
            <div className="text-center">
              <p className="text-2xl font-black text-text-primary">{Number(stats.total).toLocaleString()}</p>
              <p className="text-xs text-text-muted">Tokens Launched</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-black text-success">{Number(stats.graduated).toLocaleString()}</p>
              <p className="text-xs text-text-muted">Graduated</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-black text-text-primary">
                {(Number(stats.volume ?? "0") / 1e18).toFixed(1)} MON
              </p>
              <p className="text-xs text-text-muted">Total Volume</p>
            </div>
          </div>
        </div>
      </div>

      {/* Explore section */}
      <div id="explore" className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        <TokenFilters activeTab={tab} />

        {tokenList.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-2 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-secondary font-semibold">No tokens yet</p>
            <p className="text-text-muted text-sm">Be the first to launch one!</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors mt-2"
            >
              <Rocket className="w-4 h-4" /> Launch Token
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tokenList.map((token) => (
              <TokenCard key={token.address} token={token} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
