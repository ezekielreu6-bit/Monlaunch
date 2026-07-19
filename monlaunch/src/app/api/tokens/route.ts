import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { publicClient } from "@/lib/viem-server";
import { FACTORY_ADDRESS, MEME_FACTORY_ABI } from "@/lib/contracts";
import { ipfsToHttp } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/tokens — list tokens
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const rows = await db
      .select()
      .from(tokens)
      .orderBy(desc(tokens.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ tokens: rows });
  } catch (err) {
    console.error("[GET /api/tokens]", err);
    return NextResponse.json({ tokens: [] });
  }
}

// POST /api/tokens — index a newly created token (called after tx confirms)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, symbol, description, metadataUri, creator, txHash } = body;

    if (!creator || !metadataUri) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fetch metadata from IPFS to get imageUrl
    let imageUrl = "";
    try {
      const gateway =
        process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
      const url = metadataUri.startsWith("ipfs://")
        ? `${gateway}/ipfs/${metadataUri.slice(7)}`
        : metadataUri;
      const meta = await fetch(url, { next: { revalidate: 60 } }).then((r) =>
        r.json()
      );
      imageUrl = meta.image
        ? ipfsToHttp(meta.image)
        : "";
    } catch { /* metadata fetch optional */ }

    // Try to find the deployed token address from contract events
    let tokenAddress = "";
    try {
      const count = await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: MEME_FACTORY_ABI,
        functionName: "totalTokens",
      });
      if (count > 0n) {
        const addrs = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: MEME_FACTORY_ABI,
          functionName: "getTokensPaginated",
          args: [0n, 1n],
        });
        tokenAddress = addrs[0] ?? "";
      }
    } catch { /* best-effort */ }

    if (!tokenAddress) {
      // Fallback: store with a placeholder address based on txHash
      tokenAddress = `pending-${txHash}`;
    }

    const [inserted] = await db
      .insert(tokens)
      .values({
        address: tokenAddress.toLowerCase(),
        name,
        symbol,
        description: description ?? "",
        imageUrl,
        metadataUri: metadataUri ?? "",
        creator: creator.toLowerCase(),
        txHash: txHash ?? "",
      })
      .onConflictDoNothing()
      .returning();

    return NextResponse.json(inserted ?? { address: tokenAddress });
  } catch (err) {
    console.error("[POST /api/tokens]", err);
    return NextResponse.json({ error: "Failed to index token" }, { status: 500 });
  }
}
