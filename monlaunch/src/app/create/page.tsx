import type { Metadata } from "next";
import CreateTokenForm from "@/components/CreateTokenForm";
import { Zap, Shield, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Launch Token — MonLaunch",
  description: "Create a fair-launch meme token on Monad Testnet with a bonding curve.",
};

const STEPS = [
  { n: "1", label: "Upload image + fill details" },
  { n: "2", label: "Pay 0.01 MON launch fee" },
  { n: "3", label: "Token goes live instantly" },
];

const FEATURES = [
  { icon: Shield, label: "Fair launch", desc: "No pre-sale, no team allocation" },
  { icon: Zap, label: "Instant trading", desc: "Buy/sell from block one" },
  { icon: TrendingUp, label: "Auto-graduate", desc: "Hits 69 MON → DEX listing" },
];

export default function CreatePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Left: form */}
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-black text-white mono">LAUNCH A TOKEN</h1>
            <p className="text-text-muted text-sm mono mt-1">
              deploy on monad testnet in under 60 seconds
            </p>
          </div>
          <div className="border border-border rounded-lg bg-surface p-5">
            <CreateTokenForm />
          </div>
        </div>

        {/* Right: info panels */}
        <div className="space-y-4 lg:sticky lg:top-20">
          {/* How it works */}
          <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
            <p className="text-[11px] font-bold mono text-text-muted uppercase tracking-wider">How it works</p>
            {STEPS.map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded border border-green/40 bg-green/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-black text-green mono">{n}</span>
                </div>
                <span className="text-sm text-text-secondary">{label}</span>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="border border-border rounded-lg bg-surface divide-y divide-border">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded border border-green/20 bg-green/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-green" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className="text-[11px] text-text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contract info */}
          <div className="border border-border rounded-lg bg-surface p-4 space-y-2">
            <p className="text-[11px] font-bold mono text-text-muted uppercase tracking-wider">Contract</p>
            <div className="space-y-1.5 text-[11px] mono">
              {[
                { k: "ADDRESS", v: "0x02dd03…821f8b" },
                { k: "NETWORK", v: "Monad Testnet" },
                { k: "CHAIN ID", v: "10143" },
                { k: "FEE", v: "0.01 MON" },
                { k: "TRADE FEE", v: "1%" },
                { k: "GRADUATION", v: "69 MON" },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between">
                  <span className="text-text-muted">{k}</span>
                  <span className="text-green">{v}</span>
                </div>
              ))}
            </div>
            <a href="https://testnet.monadexplorer.com/address/0x02dd03e750945188775d1D51D5282Eb86E821f8b"
              target="_blank" rel="noopener noreferrer"
              className="block mt-2 text-center text-[11px] mono text-text-muted hover:text-green border border-border hover:border-green/30 rounded py-1.5 transition-colors">
              View on Explorer ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
