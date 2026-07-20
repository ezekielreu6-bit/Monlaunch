"use client";

/**
 * Client wrapper around the token grid.
 * Fires a single batched multicall to fetch live spot price + market cap
 * for ALL tokens in the list, then passes results down to each TokenCard.
 * Refetches every 15 seconds.
 */

import { useReadContracts } from "wagmi";
import TokenCard from "@/components/TokenCard";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";
import type { Token } from "@/lib/schema";
import Link from "next/link";
import { Rocket } from "lucide-react";

interface Props {
  tokens: Token[];
  activeTab: string;
}

export default function LiveTokenGrid({ tokens, activeTab }: Props) {
  // Two reads per token: getSpotPrice + getMarketCap
  // wagmi batches all of them into a single multicall automatically.
  const contracts = tokens.flatMap((t) => [
    {
      address: FACTORY_ADDRESS,
      abi: MEME_FACTORY_ABI,
      functionName: "getSpotPrice" as const,
      args: [t.address as `0x${string}`],
    },
    {
      address: FACTORY_ADDRESS,
      abi: MEME_FACTORY_ABI,
      functionName: "getMarketCap" as const,
      args: [t.address as `0x${string}`],
    },
  ]);

  const { data } = useReadContracts({
    contracts,
    query: { refetchInterval: 15_000, staleTime: 8_000 },
  });

  if (tokens.length === 0) {
    return (
      <div className="border border-border rounded-lg bg-surface p-20 text-center space-y-4">
        <p className="text-4xl">🚀</p>
        <p className="text-white font-bold mono">NO TOKENS YET</p>
        <p className="text-text-muted text-sm mono">be the first to launch one on Monad</p>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-green hover:bg-green-dim text-black font-black text-sm mono transition-colors mt-2"
        >
          <Rocket className="w-4 h-4" /> LAUNCH TOKEN
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {tokens.map((token, i) => {
        const livePrice     = data?.[i * 2]?.result as bigint | undefined;
        const liveMarketCap = data?.[i * 2 + 1]?.result as bigint | undefined;
        return (
          <TokenCard
            key={token.address}
            token={token}
            livePrice={livePrice}
            liveMarketCap={liveMarketCap}
            rank={activeTab === "trending" ? i + 1 : undefined}
          />
        );
      })}
    </div>
  );
}
