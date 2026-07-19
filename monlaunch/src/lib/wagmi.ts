"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient } from "@tanstack/react-query";
import { monadTestnet } from "./chains";

export { monadTestnet };

export const wagmiConfig = getDefaultConfig({
  appName: "MonLaunch",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder_id",
  chains: [monadTestnet],
  ssr: true,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 2,
    },
  },
});
