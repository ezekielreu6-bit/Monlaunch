"use client";

import { graduationPercent } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Props {
  progress: bigint;
  realMonRaised: bigint;
  compact?: boolean;
}

export default function BondingCurveProgress({
  progress,
  realMonRaised,
  compact = false,
}: Props) {
  const pct = graduationPercent(progress);
  const raisedMon = (Number(realMonRaised) / 1e18).toFixed(3);

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs text-text-secondary">
          <span>Bonding curve</span>
          <span className="text-text-primary font-medium">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background:
                pct >= 100
                  ? "#10b981"
                  : `linear-gradient(90deg, #7c3aed ${100 - pct}%, #10b981 100%)`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Trophy className="w-4 h-4 text-warning" />
          Graduation Progress
        </h3>
        <span
          className={`text-sm font-bold ${
            pct >= 100 ? "text-success" : "text-primary-light"
          }`}
        >
          {pct.toFixed(1)}%
        </span>
      </div>

      {/* Bar */}
      <div className="h-3 w-full rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              pct >= 100
                ? "#10b981"
                : `linear-gradient(90deg, #7c3aed, #8b5cf6, #10b981)`,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-text-secondary">
        <span>{raisedMon} MON raised</span>
        <span>10 MON goal</span>
      </div>

      {pct >= 100 && (
        <p className="text-xs text-success bg-success/10 px-3 py-2 rounded-lg">
          🎓 This token has graduated! Trading on DEX.
        </p>
      )}

      {pct < 100 && (
        <p className="text-xs text-text-muted">
          Once 10 MON is raised, this token graduates and its liquidity is
          seeded into a DEX.
        </p>
      )}
    </div>
  );
}
