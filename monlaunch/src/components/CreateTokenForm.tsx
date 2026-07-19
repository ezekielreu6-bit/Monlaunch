"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther, formatEther } from "viem";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import Image from "next/image";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";
import { monadTestnet } from "@/lib/chains";
import { cn } from "@/lib/utils";
import { Upload, Loader2, Rocket, ImageIcon, AlertTriangle, CheckCircle } from "lucide-react";

type Status = "idle" | "uploading" | "waiting-wallet" | "confirming" | "indexing" | "success";

export default function CreateTokenForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongChain = isConnected && chainId !== monadTestnet.id;

  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const deployedAddress = useRef<string | null>(null);

  // Read creation fee from contract
  const { data: creationFeeRaw } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: MEME_FACTORY_ABI,
    functionName: "creationFee",
  });
  const creationFee = creationFeeRaw ?? parseEther("0.01");
  const creationFeeDisplay = parseFloat(formatEther(creationFee)).toFixed(4);

  // Contract write
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess, data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setImage(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  // Handle successful tx → index in DB
  useEffect(() => {
    if (!txSuccess || !txHash) return;
    (async () => {
      setStatus("indexing");
      try {
        // Find the token address from the TokenCreated event logs
        if (txReceipt?.logs && address && metadataUri) {
          await fetch("/api/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              symbol,
              description,
              metadataUri,
              creator: address,
              txHash,
            }),
          });
        }
      } catch { /* best-effort */ }
      setStatus("success");
      setTimeout(() => router.push("/"), 2000);
    })();
  }, [txSuccess, txHash, txReceipt, address, metadataUri, name, symbol, description, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || wrongChain) return;
    if (!name.trim() || !symbol.trim()) {
      toast.error("Name and symbol are required");
      return;
    }
    if (symbol.length > 10) {
      toast.error("Symbol must be 10 characters or less");
      return;
    }
    if (!image) {
      toast.error("Please upload a token image");
      return;
    }

    setStatus("uploading");

    try {
      // Step 1: Upload image + metadata to IPFS
      const form = new FormData();
      form.append("image", image, image.name);
      form.append("name", name.trim());
      form.append("symbol", symbol.trim().toUpperCase());
      form.append("description", description.trim());

      const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }
      const { metadataUri: uri } = await uploadRes.json();
      setMetadataUri(uri);

      // Step 2: Call contract
      setStatus("waiting-wallet");
      writeContract({
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "createToken",
        args: [name.trim(), symbol.trim().toUpperCase(), uri],
        value: creationFee,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setStatus("idle");
    }
  };

  // Keep status in sync with tx state
  useEffect(() => {
    if (isPending) setStatus("waiting-wallet");
    else if (isConfirming && txHash) setStatus("confirming");
  }, [isPending, isConfirming, txHash]);

  const statusLabel: Record<Status, string> = {
    idle: `Launch Token — ${creationFeeDisplay} MON fee`,
    uploading: "Uploading to IPFS...",
    "waiting-wallet": "Confirm in wallet...",
    confirming: "Confirming transaction...",
    indexing: "Indexing token...",
    success: "Token launched! Redirecting...",
  };

  if (status === "success") {
    return (
      <div className="text-center py-16 space-y-4">
        <CheckCircle className="w-16 h-16 text-success mx-auto" />
        <h2 className="text-2xl font-bold text-text-primary">Token Launched!</h2>
        <p className="text-text-secondary">Redirecting to explore page...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Token Image <span className="text-danger">*</span>
        </label>
        <div
          {...getRootProps()}
          className={cn(
            "relative h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-surface-2"
          )}
        >
          <input {...getInputProps()} />
          {imagePreview ? (
            <Image src={imagePreview} alt="preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-text-muted">
              <ImageIcon className="w-8 h-8" />
              <p className="text-sm">Drop image here or click to upload</p>
              <p className="text-xs">PNG, JPG, GIF, WEBP — max 5 MB</p>
            </div>
          )}
          {imagePreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-sm text-white font-medium">Click to change</p>
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Token Name <span className="text-danger">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pepe on Monad"
          maxLength={64}
          className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60 transition-colors text-sm"
        />
      </div>

      {/* Symbol */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Token Symbol <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-mono">$</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="PEPE"
            maxLength={10}
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60 transition-colors text-sm font-mono uppercase"
          />
        </div>
        <p className="text-xs text-text-muted mt-1">Max 10 characters, letters and numbers only</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the world about your token..."
          rows={3}
          maxLength={500}
          className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted outline-none focus:border-primary/60 transition-colors text-sm resize-none"
        />
        <p className="text-xs text-text-muted mt-1 text-right">{description.length}/500</p>
      </div>

      {/* Fee info */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Launch fee</span>
          <span className="text-primary-light font-semibold">{creationFeeDisplay} MON</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Trade fee</span>
          <span className="text-text-primary font-semibold">1%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">Graduation target</span>
          <span className="text-text-primary font-semibold">10 MON</span>
        </div>
        <p className="text-xs text-text-muted pt-1">
          Tokens launch on a bonding curve. Once 10 MON is raised, they graduate to a DEX.
        </p>
      </div>

      {wrongChain && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30 text-warning text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Switch to Monad Testnet to continue
        </div>
      )}

      {/* Submit */}
      {!isConnected ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-text-secondary text-sm">Connect wallet to launch your token</p>
          <ConnectButton />
        </div>
      ) : (
        <button
          type="submit"
          disabled={status !== "idle" || wrongChain}
          className="w-full py-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:glow-purple flex items-center justify-center gap-2 text-base"
        >
          {status !== "idle" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Rocket className="w-5 h-5" />
          )}
          {statusLabel[status]}
        </button>
      )}
    </form>
  );
}
