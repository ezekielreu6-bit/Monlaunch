"use client";

import { shortAddress, formatMon, formatTokenAmount, timeAgo } from "@/lib/utils";
import { type Trade } from "@/lib/schema";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

interface Props {
  trades: Trade[];
  tokenSymbol: string;
}

export default function TradeHistory({ trades, tokenSymbol }: Props) {
  const explorerUrl =
    process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.monadexplorer.com";

  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-muted text-sm">
        No trades yet. Be the first to buy!
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Trade History</h3>
      </div>
      <div className="divide-y divide-border max-h-80 overflow-y-auto">
        {trades.map((t) => (
          <div key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors">
            {/* Type icon */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                t.type === "buy" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
              }`}
            >
              {t.type === "buy" ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
            </div>

            {/* Trader */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-text-secondary truncate">
                {shortAddress(t.traderAddress)}
              </p>
              <p className="text-xs text-text-muted">{timeAgo(t.createdAt!)}</p>
            </div>

            {/* Amounts */}
            <div className="text-right text-xs shrink-0">
              <p className={`font-semibold ${t.type === "buy" ? "text-success" : "text-danger"}`}>
                {t.type === "buy" ? "+" : "-"}
                {formatTokenAmount(BigInt(t.tokenAmount))} {tokenSymbol}
              </p>
              <p className="text-text-muted">
                {formatMon(BigInt(t.monAmount))} MON
              </p>
            </div>

            {/* Explorer link */}
            {t.txHash && (
              <a
                href={`${explorerUrl}/tx/${t.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-primary-light transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
