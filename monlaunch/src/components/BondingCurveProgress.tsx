"use client";

import { useTokenLiveData } from "@/hooks/useTokenLiveData";

interface Props {
  /** Initial values from the server render — shown immediately before live data arrives */
  progress: bigint;
  realMonRaised: bigint;
  compact?: boolean;
  /** When provided, self-polls chain data every 10 s and overrides the initial values */
  tokenAddress?: `0x${string}`;
}

export default function BondingCurveProgress({
  progress: initialProgress,
  realMonRaised: initialRaised,
  compact = false,
  tokenAddress,
}: Props) {
  // Conditionally poll — hook is always called but only active when tokenAddress is set
  const live = useTokenLiveData(
    tokenAddress ?? "0x0000000000000000000000000000000000000000",
    10_000,
  );

  const activeProgress  = (tokenAddress && live.progress   !== undefined) ? live.progress   : initialProgress;
  const activeRaised    = (tokenAddress && live.realMonRaised !== undefined) ? live.realMonRaised : initialRaised;
  const graduated       = (tokenAddress && live.graduated   !== undefined) ? live.graduated   : false;

  const pct        = Math.min(100, Number(activeProgress) / 100);
  const raisedMon  = (Number(activeRaised) / 1e18).toFixed(4);
  const raisedNum  = Number(activeRaised) / 1e18;
  const remaining  = Math.max(0, 10 - raisedNum).toFixed(4);

  if (compact) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs mono">
          <span className="text-text-muted">bonding curve</span>
          <span className="text-green font-bold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 100 ? "#00ff88" : "linear-gradient(90deg, #00cc6a, #00ff88)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border border-border rounded-lg bg-surface space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Bonding Curve</h3>
        <div className="flex items-center gap-2">
          {tokenAddress && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              <span className="text-[9px] mono text-green/70">LIVE</span>
            </span>
          )}
          <span className="text-sm font-bold mono text-green">{pct.toFixed(2)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 w-full rounded bg-surface-3 overflow-hidden border border-border">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 100
              ? "#00ff88"
              : "linear-gradient(90deg, #00994d, #00cc6a, #00ff88)",
            boxShadow: "0 0 8px rgba(0,255,136,0.4)",
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold mono mix-blend-luminosity"
          style={{ color: pct > 50 ? "#000" : "#00ff88" }}
        >
          {raisedMon} / 10 MON
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "RAISED",  value: raisedMon,  color: "text-white" },
          { label: "NEEDED",  value: remaining,  color: "text-white" },
          { label: "GOAL",    value: "10.0",     color: "text-green" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-2 border border-border rounded p-2">
            <p className="text-[10px] text-text-muted mono">{label}</p>
            <p className={`text-sm font-bold mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {graduated || pct >= 100 ? (
        <p className="text-xs text-green bg-green/5 border border-green/20 px-3 py-2 rounded mono">
          ✓ GRADUATED — trading on DEX
        </p>
      ) : (
        <p className="text-[11px] text-text-muted leading-relaxed">
          When 10 MON is raised, this token graduates and its liquidity is deposited
          into a DEX. All {(10 - raisedNum).toFixed(3)} MON still needed.
        </p>
      )}
    </div>
  );
}
