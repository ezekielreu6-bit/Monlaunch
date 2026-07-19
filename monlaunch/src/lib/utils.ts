import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shorten a wallet address: 0x1234…abcd */
export function shortAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format a bigint (18-decimal) as a readable MON value */
export function formatMon(value: bigint, decimals = 6): string {
  const divisor = 10n ** 18n;
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, decimals);
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole.toString();
}

/** Format a token amount (18-decimal) with compact notation */
export function formatTokenAmount(value: bigint): string {
  const num = Number(formatMon(value, 4));
  return compactNumber(num);
}

/** Format a number into compact notation: 1.2M, 4.5K, etc. */
export function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n < 0.000001 && n > 0) return n.toExponential(3);
  return n.toFixed(4);
}

/** Format a price in MON with appropriate precision */
export function formatPrice(value: bigint): string {
  const num = Number(value) / 1e18;
  if (num === 0) return "0";
  if (num < 0.000001) return num.toExponential(4);
  if (num < 0.001) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  return num.toFixed(4);
}

/** Format a market cap in MON */
export function formatMarketCap(value: bigint): string {
  const num = Number(value) / 1e18;
  return `${compactNumber(num)} MON`;
}

/** Graduation progress as a percentage (0–100) */
export function graduationPercent(progress: bigint): number {
  return Math.min(100, Number(progress) / 100);
}

/** Time ago string */
export function timeAgo(date: Date | string | number): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Build an IPFS gateway URL from an ipfs:// or raw CID */
export function ipfsToHttp(uri: string): string {
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
  if (!uri) return "/placeholder-token.png";
  if (uri.startsWith("ipfs://")) {
    return `${gateway}/ipfs/${uri.slice(7)}`;
  }
  if (uri.startsWith("http")) return uri;
  return `${gateway}/ipfs/${uri}`;
}

/** Sleep helper */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Parse a token struct returned from the contract */
export interface ChainTokenInfo {
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  metadataURI: string;
  monReserve: bigint;
  tokenReserve: bigint;
  realMonRaised: bigint;
  graduated: boolean;
  createdAt: bigint;
}
