"use client";

import { useState, useCallback } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther, maxUint256 } from "viem";
import toast from "react-hot-toast";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI, ERC20_ABI } from "@/lib/contracts";
import { monadTestnet } from "@/lib/wagmi";
import { formatMon, formatTokenAmount, cn } from "@/lib/utils";
import { ArrowDown, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
  graduated: boolean;
}

type Tab = "buy" | "sell";

export default function BuySellPanel({ tokenAddress, tokenSymbol, graduated }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [tab, setTab] = useState<Tab>("buy");
  const [amount, setAmount] = useState("");

  const wrongChain = isConnected && chainId !== monadTestnet.id;

  // ── Balances ────────────────────────────────────────────────────────────────
  const { data: monBalance } = useBalance({ address });
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ── Allowance ───────────────────────────────────────────────────────────────
  const { data: allowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, FACTORY_ADDRESS] : undefined,
    query: { enabled: !!address && tab === "sell" },
  });

  // ── Quote ───────────────────────────────────────────────────────────────────
  const parsedAmount = (() => {
    try {
      return amount ? parseEther(amount) : 0n;
    } catch {
      return 0n;
    }
  })();

  const { data: buyQuote } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: MEME_FACTORY_ABI,
    functionName: "quoteBuy",
    args: [tokenAddress, parsedAmount],
    query: { enabled: tab === "buy" && parsedAmount > 0n },
  });

  const { data: sellQuote } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: MEME_FACTORY_ABI,
    functionName: "quoteSell",
    args: [tokenAddress, parsedAmount],
    query: { enabled: tab === "sell" && parsedAmount > 0n },
  });

  // ── Write contracts ─────────────────────────────────────────────────────────
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const needsApproval =
    tab === "sell" &&
    parsedAmount > 0n &&
    (allowance ?? 0n) < parsedAmount;

  const handleApprove = useCallback(() => {
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [FACTORY_ADDRESS, maxUint256],
    });
    toast.loading("Approving...", { id: "approve" });
  }, [writeContract, tokenAddress]);

  const handleBuy = useCallback(() => {
    if (!parsedAmount) return;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: MEME_FACTORY_ABI,
      functionName: "buy",
      args: [tokenAddress],
      value: parsedAmount,
    });
    toast.loading("Buying tokens...", { id: "trade" });
  }, [writeContract, tokenAddress, parsedAmount]);

  const handleSell = useCallback(() => {
    if (!parsedAmount) return;
    const slippage = 50n; // 0.5% extra slippage buffer
    const minOut = sellQuote
      ? (sellQuote[0] * (10000n - slippage)) / 10000n
      : 0n;
    writeContract({
      address: FACTORY_ADDRESS,
      abi: MEME_FACTORY_ABI,
      functionName: "sell",
      args: [tokenAddress, parsedAmount, minOut],
    });
    toast.loading("Selling tokens...", { id: "trade" });
  }, [writeContract, tokenAddress, parsedAmount, sellQuote]);

  // Handle transaction success
  if (isSuccess) {
    toast.success(tab === "buy" ? "Tokens purchased!" : "Tokens sold!", { id: "trade" });
  }

  const isLoading = isPending || isConfirming;
  const quote = tab === "buy" ? buyQuote?.[0] : sellQuote?.[0];

  const maxAmount =
    tab === "buy"
      ? monBalance
        ? parseFloat(formatEther(monBalance.value)).toFixed(4)
        : "0"
      : tokenBalance
      ? parseFloat(formatEther(tokenBalance)).toFixed(0)
      : "0";

  if (!isConnected) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-surface text-center space-y-3">
        <p className="text-text-secondary text-sm">Connect your wallet to trade</p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (graduated) {
    return (
      <div className="p-6 rounded-2xl border border-success/30 bg-success/5 text-center space-y-2">
        <p className="text-success font-semibold">🎓 Token Graduated</p>
        <p className="text-text-secondary text-sm">
          This token is now trading on a DEX. Bonding curve trading is closed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setAmount(""); }}
            className={cn(
              "flex-1 py-3 text-sm font-semibold capitalize transition-colors",
              tab === t
                ? t === "buy"
                  ? "bg-success/10 text-success border-b-2 border-success"
                  : "bg-danger/10 text-danger border-b-2 border-danger"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {wrongChain && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Wrong network. Switch to Monad Testnet.
          </div>
        )}

        {/* Amount input */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-text-secondary">
            <span>{tab === "buy" ? "You pay (MON)" : `You sell ($${tokenSymbol})`}</span>
            <button
              className="text-primary-light hover:underline"
              onClick={() => setAmount(maxAmount)}
            >
              Max: {maxAmount}
            </button>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-2 border border-border focus-within:border-primary/50 transition-colors">
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent text-text-primary text-lg font-semibold outline-none placeholder:text-text-muted [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              min="0"
              step="any"
            />
            <span className="text-text-secondary text-sm font-medium shrink-0">
              {tab === "buy" ? "MON" : tokenSymbol}
            </span>
          </div>
        </div>

        {/* Arrow */}
        {quote !== undefined && parsedAmount > 0n && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <ArrowDown className="w-4 h-4 text-text-muted" />
            <div className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* Quote */}
        {quote !== undefined && parsedAmount > 0n && (
          <div className="p-3 rounded-xl bg-surface-2 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">You receive</span>
              <span className="text-text-primary font-semibold">
                {tab === "buy"
                  ? `${formatTokenAmount(quote)} ${tokenSymbol}`
                  : `${formatMon(quote)} MON`}
              </span>
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>Fee (1%)</span>
              <span>
                {tab === "buy"
                  ? `${formatMon(buyQuote?.[1] ?? 0n)} MON`
                  : `${formatMon(sellQuote?.[1] ?? 0n)} MON`}
              </span>
            </div>
          </div>
        )}

        {/* Action button */}
        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={isLoading || wrongChain}
            className="w-full py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Approve {tokenSymbol}
          </button>
        ) : (
          <button
            onClick={tab === "buy" ? handleBuy : handleSell}
            disabled={!parsedAmount || isLoading || wrongChain}
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
              tab === "buy"
                ? "bg-success hover:bg-success/90 hover:glow-green"
                : "bg-danger hover:bg-danger/90"
            )}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isConfirming
              ? "Confirming..."
              : tab === "buy"
              ? `Buy ${tokenSymbol}`
              : `Sell ${tokenSymbol}`}
          </button>
        )}
      </div>
    </div>
  );
}
