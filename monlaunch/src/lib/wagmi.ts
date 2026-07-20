"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient } from "@tanstack/react-query";
import { http } from "viem";
import { monadTestnet } from "./chains";

export { monadTestnet };

export const wagmiConfig = getDefaultConfig({
  appName: "MonLaunch",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder_id",
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz",
      {
        batch: { batchSize: 10, wait: 16 }, // batches multiple eth_calls into one RPC round-trip
      }
    ),
  },
  ssr: true,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1, 
    },
  },
});