"use client";

import { useState, useCallback, useEffect } from "react";
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
import { compressImage } from "@/lib/compress-image";
import { Loader2, Rocket, AlertTriangle, CheckCircle, ImageIcon } from "lucide-react";

type Status =
  | "idle"
  | "compressing"
  | "uploading-image"
  | "uploading-metadata"
  | "waiting-wallet"
  | "confirming"
  | "indexing"
  | "success";

const STATUS_LABEL: Record<Status, string> = {
  idle:              "LAUNCH TOKEN",
  compressing:       "COMPRESSING IMAGE...",
  "uploading-image": "UPLOADING IMAGE...",
  "uploading-metadata": "UPLOADING METADATA...",
  "waiting-wallet":  "CONFIRM IN WALLET...",
  confirming:        "CONFIRMING TX...",
  indexing:          "INDEXING...",
  success:           "LAUNCHED! REDIRECTING...",
};

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

  const { data: creationFeeRaw } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: MEME_FACTORY_ABI,
    functionName: "creationFee",
  });
  const creationFee = creationFeeRaw ?? parseEther("0.01");
  const creationFeeDisplay = parseFloat(formatEther(creationFee)).toFixed(4);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess, data: txReceipt } = useWaitForTransactionReceipt({ hash: txHash });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  useEffect(() => {
    if (!txSuccess || !txHash) return;
    (async () => {
      setStatus("indexing");
      try {
        if (address && metadataUri) {
          await fetch("/api/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, symbol, description, metadataUri, creator: address, txHash }),
          });
        }
      } catch { }
      setStatus("success");
      setTimeout(() => router.push("/"), 2500);
    })();
  }, [txSuccess, txHash, address, metadataUri, name, symbol, description, router]);

  useEffect(() => {
    if (isPending) setStatus("waiting-wallet");
    else if (isConfirming && txHash) setStatus("confirming");
  }, [isPending, isConfirming, txHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || wrongChain) return;
    if (!name.trim() || !symbol.trim()) { toast.error("Name and symbol required"); return; }
    if (symbol.length > 10) { toast.error("Symbol max 10 chars"); return; }
    if (!image) { toast.error("Image required"); return; }

    try {
      // Step 1 â€” compress image in-browser (600px, 85% JPEG) before any network call
      setStatus("compressing");
      const compressed = await compressImage(image, 600, 0.85);

      // Step 2 â€” upload compressed image to IPFS
      setStatus("uploading-image");
      const imgForm = new FormData();
      imgForm.append("image", compressed, compressed.name);
      const imgRes = await fetch("/api/upload/image", { method: "POST", body: imgForm });
      if (!imgRes.ok) throw new Error((await imgRes.json()).error || "Image upload failed");
      const { imageIpfsUri } = await imgRes.json();

      // Step 3 â€” upload metadata JSON to IPFS
      setStatus("uploading-metadata");
      const metaRes = await fetch("/api/upload/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
          description: description.trim(),
          imageIpfsUri,
        }),
      });
      if (!metaRes.ok) throw new Error((await metaRes.json()).error || "Metadata upload failed");
      const { metadataUri: uri } = await metaRes.json();
      setMetadataUri(uri);

      // Step 4 â€” write contract (wallet prompt handled by useEffect)
      setStatus("waiting-wallet");
      writeContract({
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "createToken",
        args: [name.trim(), symbol.trim().toUpperCase(), uri],
        value: creationFee,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setStatus("idle");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-14 h-14 text-green mx-auto" />
        <p className="text-xl font-black text-white mono">TOKEN LAUNCHED!</p>
        <p className="text-text-muted text-sm mono">redirecting to explore page...</p>
      </div>
    );
  }

  const isLoading = status !== "idle";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Image */}
      <div>
        <label className="block text-[11px] font-bold mono text-text-muted uppercase tracking-wider mb-2">
          Token Image <span className="text-red-400">*</span>
        </label>
        <div {...getRootProps()} className={cn(
          "relative h-44 rounded border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          isDragActive ? "border-green bg-green/5" : "border-border hover:border-border-bright bg-surface-2"
        )}>
          <input {...getInputProps()} />
          {imagePreview ? (
            <Image src={imagePreview} alt="preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-text-muted">
              <ImageIcon className="w-8 h-8 opacity-30" />
              <p className="text-sm mono">drag & drop or click to upload</p>
              <p className="text-[11px] mono opacity-50">PNG Â· JPG Â· GIF Â· WEBP Â· max 5MB</p>
            </div>
          )}
          {imagePreview && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
              <p className="text-xs mono text-white">click to change</p>
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-bold mono text-text-muted uppercase tracking-wider mb-1.5">
          Token Name <span className="text-red-400">*</span>
        </label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pepe on Monad"
          maxLength={64}
          className="w-full px-3 py-2.5 rounded bg-surface-2 border border-border text-white placeholder:text-text-muted outline-none focus:border-green/40 transition-colors text-sm"
        />
      </div>

      {/* Symbol */}
      <div>
        <label className="block text-[11px] font-bold mono text-text-muted uppercase tracking-wider mb-1.5">
          Ticker Symbol <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green font-bold mono">$</span>
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="PEPE"
            maxLength={10}
            className="w-full pl-7 pr-3 py-2.5 rounded bg-surface-2 border border-border text-green placeholder:text-text-muted outline-none focus:border-green/40 transition-colors text-sm font-bold mono uppercase"
          />
        </div>
        <p className="text-[10px] mono text-text-muted mt-1">max 10 chars Â· letters and numbers only</p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-bold mono text-text-muted uppercase tracking-wider mb-1.5">
          Description <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the world about your token..."
          rows={3} maxLength={500}
          className="w-full px-3 py-2.5 rounded bg-surface-2 border border-border text-white placeholder:text-text-muted outline-none focus:border-green/40 transition-colors text-sm resize-none"
        />
        <p className="text-[10px] mono text-text-muted mt-1 text-right">{description.length}/500</p>
      </div>

      {/* Fee breakdown */}
      <div className="border border-border rounded bg-surface-2 divide-y divide-border">
        {[
          { k: "Launch fee", v: `${creationFeeDisplay} MON`, highlight: true },
          { k: "Trade fee", v: "1% per trade" },
          { k: "Graduation target", v: "10 MON" },
          { k: "Total supply", v: "1,000,000,000" },
        ].map(({ k, v, highlight }) => (
          <div key={k} className="flex justify-between px-3 py-2 text-[11px] mono">
            <span className="text-text-muted">{k}</span>
            <span className={highlight ? "text-green font-bold" : "text-white"}>{v}</span>
          </div>
        ))}
      </div>

      {wrongChain && (
        <div className="flex items-center gap-2 p-2.5 rounded border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Switch network to Monad Testnet
        </div>
      )}

      {!isConnected ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-text-muted text-xs mono">connect wallet to launch</p>
          <ConnectButton />
        </div>
      ) : (
        <button
          type="submit"
          disabled={isLoading || wrongChain}
          className="w-full py-3.5 rounded font-black text-sm mono uppercase tracking-wider text-black bg-green hover:bg-green-dim disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {STATUS_LABEL[status]}
        </button>
      )}
    </form>
  );
}