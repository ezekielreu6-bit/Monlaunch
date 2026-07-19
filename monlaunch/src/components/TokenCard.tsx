"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice, formatMarketCap, shortAddress, ipfsToHttp, timeAgo, graduationPercent } from "@/lib/utils";
import { type Token } from "@/lib/schema";
import { TrendingUp, Clock } from "lucide-react";

interface Props {
  token: Token;
}

export default function TokenCard({ token }: Props) {
  const pct = graduationPercent(BigInt(token.totalVolumeMon ?? "0")); // using volume as proxy; real progress from chain
  const imageUrl = token.imageUrl ? ipfsToHttp(token.imageUrl) : null;

  return (
    <Link
      href={`/token/${token.address}`}
      className="block group rounded-2xl border border-border bg-surface hover:border-primary/50 hover:bg-surface-2 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
    >
      {/* Image */}
      <div className="relative h-40 w-full bg-surface-2 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={token.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-black text-primary/20">
              {token.symbol.slice(0, 2)}
            </span>
          </div>
        )}
        {/* Graduated badge */}
        {token.graduated && (
          <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold rounded-full bg-success/20 text-success border border-success/30">
            🎓 Graduated
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-text-primary leading-tight">{token.name}</p>
            <p className="text-xs text-text-secondary font-mono">${token.symbol}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-text-muted">Market cap</p>
            <p className="text-sm font-bold text-text-primary">
              {formatMarketCap(BigInt(token.realMonRaised ?? "0"))}
            </p>
          </div>
        </div>

        {token.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {token.description}
          </p>
        )}

        {/* Bonding curve progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-text-muted">
            <span>Bonding curve</span>
            <span className="text-text-secondary">
              {((Number(token.realMonRaised ?? "0") / 1e18) / 10 * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (Number(token.realMonRaised ?? "0") / 1e18) / 10 * 100)}%`,
                background: token.graduated
                  ? "#10b981"
                  : "linear-gradient(90deg, #7c3aed, #8b5cf6)",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            {timeAgo(token.createdAt!)}
          </div>
          <div className="flex items-center gap-1 text-xs text-text-secondary">
            <TrendingUp className="w-3 h-3 text-success" />
            {token.tradeCount ?? 0} trades
          </div>
        </div>
        <div className="text-xs text-text-muted">
          by{" "}
          <span className="font-mono text-primary-light/80">
            {shortAddress(token.creator)}
          </span>
        </div>
      </div>
    </Link>
  );
}
