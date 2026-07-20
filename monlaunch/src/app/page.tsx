import Link from "next/link";
import { Suspense } from "react";
import { Zap, Rocket, TrendingUp, Users } from "lucide-react";
import LiveTokenGrid from "@/components/LiveTokenGrid";
import TokenFilters from "@/components/TokenFilters";
import { db } from "@/lib/db";
import { tokens } from "@/lib/schema";
import { desc, eq, sql } from "drizzle-orm";
import type { Token } from "@/lib/schema";

async function getTokens(tab: string): Promise<Token[]> {
  try {
    if (tab === "graduated")
      return await db.select().from(tokens).where(eq(tokens.graduated, true)).orderBy(desc(tokens.totalVolumeMon)).limit(48);
    if (tab === "trending")
      return await db.select().from(tokens).orderBy(desc(tokens.tradeCount), desc(tokens.createdAt)).limit(48);
    return await db.select().from(tokens).orderBy(desc(tokens.createdAt)).limit(48);
  } catch { return []; }
}

async function getStats() {
  try {
    const [r] = await db.select({
      total: sql<number>`count(*)`,
      graduated: sql<number>`sum(case when graduated then 1 else 0 end)`,
      volume: sql<string>`coalesce(sum(real_mon_raised::numeric), 0)::text`,
    }).from(tokens);
    return r;
  } catch { return { total: 0, graduated: 0, volume: "0" }; }
}

async function getKingOfHill(): Promise<Token | null> {
  try {
    const [t] = await db.select().from(tokens)
      .where(eq(tokens.graduated, false))
      .orderBy(desc(tokens.realMonRaised))
      .limit(1);
    return t ?? null;
  } catch { return null; }
}

export default async function Home({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = searchParams?.tab ?? "new";
  const [tokenList, stats, king] = await Promise.all([getTokens(tab), getStats(), getKingOfHill()]);
  const volumeMon = (Number(stats?.volume ?? "0") / 1e18).toFixed(1);

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <div className="border-b border-border bg-hero-glow">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded border border-green/30 bg-green/10 text-green text-[11px] font-bold mono">
                  LIVE ON MONAD TESTNET
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                LAUNCH YOUR<br />
                <span className="text-green">MEME TOKEN</span>
              </h1>
              <p className="text-text-secondary text-sm max-w-md leading-relaxed">
                Fair-launch tokens on a bonding curve. No pre-sale, no VCs, no rugs.
                Buy and sell in the same block as launch.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/create"
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-green hover:bg-green-dim text-black font-black text-sm mono uppercase tracking-wider transition-colors">
                  <Rocket className="w-4 h-4" /> Launch Token
                </Link>
                <a href="https://testnet.monadexplorer.com/address/0xEA2530C202BcDc14bF57277137A3802e19705D7e"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded border border-border hover:border-green/30 text-text-secondary hover:text-white text-sm mono transition-colors">
                  <Zap className="w-4 h-4 text-green" /> View Contract
                </a>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-0 border border-border rounded-lg overflow-hidden shrink-0">
              {[
                { label: "TOKENS", value: Number(stats?.total ?? 0).toLocaleString(), icon: Rocket },
                { label: "GRADUATED", value: Number(stats?.graduated ?? 0).toLocaleString(), icon: TrendingUp },
                { label: "VOLUME", value: `${volumeMon} MON`, icon: Users },
              ].map(({ label, value, icon: Icon }, i) => (
                <div key={label} className={`px-5 py-4 text-center ${i > 0 ? "border-l border-border" : ""}`}>
                  <p className="text-[10px] mono text-text-muted mb-1">{label}</p>
                  <p className="text-xl font-black text-white mono">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── King of the Hill ── */}
      {king && (
        <div className="border-b border-border bg-king-glow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold mono text-green">👑 KING OF THE HILL</span>
              <span className="text-[10px] text-text-muted mono">closest to graduation</span>
            </div>
            <Link href={`/token/${king.address}`}
              className="flex items-center gap-4 p-3 rounded-lg border border-green/20 bg-green/5 hover:border-green/40 hover:bg-green/10 transition-all group w-fit">
              <div className="relative w-12 h-12 rounded border border-green/20 bg-surface-2 overflow-hidden shrink-0">
                {king.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={king.imageUrl} alt={king.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-black text-green/30">{king.symbol.slice(0, 2)}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="font-black text-white">
                  <span className="text-green mono">${king.symbol}</span>
                  <span className="text-text-secondary text-sm font-normal ml-2">{king.name}</span>
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-32 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                    <div className="h-full rounded-full bg-green"
                      style={{ width: `${Math.min(100, (Number(king.realMonRaised ?? "0") / 1e18) / 10 * 100)}%` }} />
                  </div>
                  <span className="text-xs mono text-green font-bold">
                    {((Number(king.realMonRaised ?? "0") / 1e18) / 10 * 100).toFixed(1)}% to graduation
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* ── Token grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TokenFilters activeTab={tab} />
          <span className="text-[11px] mono text-text-muted hidden sm:block">
            {tokenList.length} tokens
          </span>
        </div>

        <LiveTokenGrid tokens={tokenList} activeTab={tab} />
      </div>

      {/* ── Ticker bar ── */}
      <div className="fixed bottom-0 inset-x-0 h-8 border-t border-border bg-black/95 backdrop-blur-sm flex items-center overflow-hidden z-40">
        <div className="flex items-center gap-1 shrink-0 px-3 border-r border-border h-full">
          <span className="text-[10px] font-bold mono text-green">LIVE</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[10px] mono text-text-muted whitespace-nowrap px-4">
            MonLaunch · Monad Testnet · Chain ID 10143 · Contract: 0xEA2530C202BcDc14bF57277137A3802e19705D7e · Fair launch bonding curve · 1% trade fee · 10 MON graduation threshold
          </p>
        </div>
      </div>

      {/* pad for ticker */}
      <div className="h-8" />
    </div>
  );
}
