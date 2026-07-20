"use client";

import Link from "next/link";
import Image from "next/image";
import {
  shortAddress,
  timeAgo,
  ipfsToHttp,
  formatPrice,
  formatMarketCap,
  calcSpotPrice,
  calcMarketCap,
} from "@/lib/utils";
import { type Token } from "@/lib/schema";
import { TrendingUp, Zap } from "lucide-react";

interface Props {
  token: Token;
  rank?: number;
  /** Live values injected by LiveTokenGrid (single batched multicall) */
  livePrice?: bigint;
  liveMarketCap?: bigint;
}

export default function TokenCard({ token, rank, livePrice, liveMarketCap }: Props) {
  const imageUrl = token.imageUrl ? ipfsToHttp(token.imageUrl) : null;

  // ── Price: prefer live chain value, fallback to DB reserves ──────────────
  const dbMonReserve    = BigInt(token.monReserve    ?? "0");
  const dbTokenReserve  = BigInt(token.tokenReserve  ?? "0");
  const spotPrice       = livePrice    ?? calcSpotPrice(dbMonReserve, dbTokenReserve);
  const marketCapRaw    = liveMarketCap ?? calcMarketCap(dbMonReserve, dbTokenReserve);
  const hasLive         = livePrice !== undefined;

  // ── Bonding curve progress ────────────────────────────────────────────────
  const raisedWei  = BigInt(token.realMonRaised ?? "0");
  const raisedMon  = Number(raisedWei) / 1e18;
  const pct        = Math.min(100, (raisedMon / 69) * 100);

  return (
    <Link
      href={`/token/${token.address}`}
      className="group block bg-surface border border-border rounded-lg overflow-hidden card-hover"
    >
      <div className="flex gap-3 p-3">
        {/* Square image */}
        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-surface-2 border border-border shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={token.name}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-xl font-black text-green/20">
                {token.symbol.slice(0, 2)}
              </span>
            </div>
          )}
          {token.graduated && (
            <div className="absolute inset-0 bg-green/10 flex items-center justify-center">
              <span className="text-[10px] font-bold text-green">🎓</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-green mono">${token.symbol}</span>
                {hasLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse shrink-0" title="Live price" />
                )}
              </div>
              <p className="text-xs text-text-secondary truncate leading-tight">{token.name}</p>
            </div>
            {rank != null && (
              <span className="text-[10px] font-mono text-text-muted shrink-0">#{rank}</span>
            )}
          </div>

          {token.description && (
            <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
              {token.description}
            </p>
          )}

          <div className="flex items-center justify-between text-[10px] text-text-muted mono">
            <span>by {shortAddress(token.creator, 3)}</span>
            <span className="flex items-center gap-1 text-text-secondary">
              <TrendingUp className="w-2.5 h-2.5 text-green" />
              {token.tradeCount ?? 0} trades
            </span>
          </div>
        </div>
      </div>

      {/* Price + market cap row */}
      <div className="px-3 pb-1 grid grid-cols-2 gap-2">
        <div className="bg-surface-2 border border-border rounded px-2 py-1">
          <p className="text-[9px] mono text-text-muted mb-0.5">PRICE</p>
          <p className="text-[11px] font-bold mono text-white truncate">
            {formatPrice(spotPrice)}{" "}
            <span className="text-text-muted font-normal">MON</span>
          </p>
        </div>
        <div className="bg-surface-2 border border-border rounded px-2 py-1">
          <p className="text-[9px] mono text-text-muted mb-0.5">MARKET CAP</p>
          <p className="text-[11px] font-bold mono text-green truncate">
            {formatMarketCap(marketCapRaw)}
          </p>
        </div>
      </div>

      {/* Bonding curve bar */}
      <div className="px-3 pb-3 pt-2 space-y-1">
        <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: token.graduated
                ? "#00ff88"
                : `linear-gradient(90deg, #00cc6a ${100 - pct}%, #00ff88 100%)`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] mono">
          <span className="text-text-muted">
            <Zap className="w-2.5 h-2.5 inline -mt-0.5 text-green" />{" "}
            {raisedMon.toFixed(3)} / 69 MON
          </span>
          <span className={token.graduated ? "text-green font-bold" : "text-text-muted"}>
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
