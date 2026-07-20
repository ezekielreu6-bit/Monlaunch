"use client";

/**
 * Live-polling stats panel shown in the token detail page header.
 * Accepts initial (server-rendered) values and refreshes from chain every 8 s.
 */

import { useEffect, useState } from "react";
import { useTokenLiveData } from "@/hooks/useTokenLiveData";
import { formatPrice, formatMarketCap } from "@/lib/utils";
import { Activity } from "lucide-react";

interface Props {
  tokenAddress: `0x${string}`;
  initialSpotPrice: bigint;
  initialMarketCap: bigint;
  initialRaised: bigint;
  initialTradeCount: number;
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-2.5 text-center">
      <p className="text-[10px] mono text-text-muted">{label}</p>
      <p className={`text-sm font-black mono ${highlight ? "text-green" : "text-white"}`}>{value}</p>
    </div>
  );
}

export default function TokenLiveStats({
  tokenAddress,
  initialSpotPrice,
  initialMarketCap,
  initialRaised,
  initialTradeCount,
}: Props) {
  const { spotPrice, marketCap, realMonRaised, isLoading } = useTokenLiveData(
    tokenAddress,
    8_000,
  );

  // Use server-rendered initial values until the first live fetch lands
  const price  = spotPrice    ?? initialSpotPrice;
  const mcap   = marketCap    ?? initialMarketCap;
  const raised = realMonRaised ?? initialRaised;

  // Pulse the live indicator when data refreshes
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (spotPrice !== undefined) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [spotPrice]);

  const raisedMon = (Number(raised) / 1e18).toFixed(4);

  return (
    <div className="shrink-0 border border-border rounded-lg overflow-hidden">
      {/* LIVE indicator */}
      <div className="flex items-center justify-center gap-1.5 py-1.5 border-b border-border bg-surface-2">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            pulse ? "bg-green scale-125" : "bg-green/60"
          } ${!isLoading ? "animate-pulse" : ""}`}
        />
        <span className="text-[9px] font-bold mono text-green/80 tracking-widest">LIVE</span>
        <Activity className="w-2.5 h-2.5 text-green/50" />
      </div>

      <div className="divide-y divide-border">
        <Stat label="PRICE" value={`${formatPrice(price)} MON`} />
        <Stat label="MARKET CAP" value={formatMarketCap(mcap)} highlight />
        <Stat label="RAISED" value={`${raisedMon} MON`} />
        <Stat label="TRADES" value={String(initialTradeCount)} />
      </div>
    </div>
  );
}
