"use client";

import { useReadContracts } from "wagmi";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";

export interface TokenLiveData {
  spotPrice: bigint | undefined;
  marketCap: bigint | undefined;
  progress: bigint | undefined;    // 0–10 000 (basis points, so /100 = %)
  realMonRaised: bigint | undefined;
  monReserve: bigint | undefined;
  tokenReserve: bigint | undefined;
  graduated: boolean | undefined;
  isLoading: boolean;
  refetch: () => void;
}

type TokenStruct = readonly [
  string,  // tokenAddress
  string,  // creator
  string,  // name
  string,  // symbol
  string,  // metadataURI
  bigint,  // monReserve
  bigint,  // tokenReserve
  bigint,  // realMonRaised
  boolean, // graduated
  bigint,  // createdAt
];

export function useTokenLiveData(
  tokenAddress: `0x${string}`,
  refetchInterval = 10_000,
): TokenLiveData {
  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "getSpotPrice",
        args: [tokenAddress],
      },
      {
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "getMarketCap",
        args: [tokenAddress],
      },
      {
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "getGraduationProgress",
        args: [tokenAddress],
      },
      {
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "tokens",
        args: [tokenAddress],
      },
    ],
    query: { refetchInterval, staleTime: 5_000 },
  });

  const struct = data?.[3]?.result as TokenStruct | undefined;

  return {
    spotPrice:     data?.[0]?.result as bigint | undefined,
    marketCap:     data?.[1]?.result as bigint | undefined,
    progress:      data?.[2]?.result as bigint | undefined,
    realMonRaised: struct?.[7],
    monReserve:    struct?.[5],
    tokenReserve:  struct?.[6],
    graduated:     struct?.[8],
    isLoading,
    refetch,
  };
}
