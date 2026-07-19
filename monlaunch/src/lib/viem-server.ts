// Server-side only — do NOT import from client components
import { createPublicClient, http } from "viem";
import { monadTestnet } from "./chains";

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(
    process.env.NEXT_PUBLIC_RPC_URL || "https://testnet-rpc.monad.xyz"
  ),
});
