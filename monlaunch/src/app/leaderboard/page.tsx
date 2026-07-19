import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { tokens } from "@/lib/schema";
import { desc } from "drizzle-orm";
import { ipfsToHttp, shortAddress, formatMarketCap, timeAgo } from "@/lib/utils";
import { Trophy, TrendingUp, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboard — MonLaunch",
  description: "Top tokens by trading volume on MonLaunch",
};

export default async function LeaderboardPage() {
  const topTokens = await db
    .select()
    .from(tokens)
    .orderBy(desc(tokens.tradeCount), desc(tokens.realMonRaised))
    .limit(50)
    .catch(() => []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-text-primary flex items-center gap-2">
          <Trophy className="w-7 h-7 text-warning" /> Leaderboard
        </h1>
        <p className="text-text-secondary text-sm">Top tokens ranked by trading activity</p>
      </div>

      {topTokens.length === 0 ? (
        <div className="text-center py-20 text-text-muted">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No data yet — be the first to launch a token!</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_140px_120px_80px] gap-3 px-4 py-3 border-b border-border text-xs font-semibold text-text-muted">
            <span>#</span>
            <span>Token</span>
            <span className="text-right">Raised</span>
            <span className="text-right">Trades</span>
            <span className="text-right">Status</span>
          </div>

          {/* Rows */}
          {topTokens.map((token, i) => {
            const imageUrl = token.imageUrl ? ipfsToHttp(token.imageUrl) : null;
            const pct = Math.min(100, (Number(token.realMonRaised ?? "0") / 1e18) / 10 * 100);
            return (
              <Link
                key={token.address}
                href={`/token/${token.address}`}
                className="grid grid-cols-[40px_1fr_140px_120px_80px] gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-2 transition-colors items-center"
              >
                {/* Rank */}
                <span
                  className={`text-sm font-bold text-center ${
                    i === 0
                      ? "text-warning"
                      : i === 1
                      ? "text-text-secondary"
                      : i === 2
                      ? "text-amber-600"
                      : "text-text-muted"
                  }`}
                >
                  {i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}
                </span>

                {/* Token info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-surface-2 border border-border shrink-0">
                    {imageUrl ? (
                      <Image src={imageUrl} alt={token.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary/40">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary text-sm truncate">{token.name}</p>
                    <p className="text-xs font-mono text-text-muted">${token.symbol}</p>
                  </div>
                </div>

                {/* Raised */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">
                    {(Number(token.realMonRaised ?? "0") / 1e18).toFixed(3)} MON
                  </p>
                  <div className="h-1 w-full rounded-full bg-surface-2 mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: token.graduated ? "#10b981" : "linear-gradient(90deg, #7c3aed, #8b5cf6)",
                      }}
                    />
                  </div>
                </div>

                {/* Trades */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">{token.tradeCount ?? 0}</p>
                </div>

                {/* Status */}
                <div className="text-right">
                  {token.graduated ? (
                    <span className="text-xs font-bold text-success">🎓 DEX</span>
                  ) : (
                    <span className="text-xs font-bold text-primary-light flex items-center justify-end gap-1">
                      <Zap className="w-3 h-3" /> Live
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
