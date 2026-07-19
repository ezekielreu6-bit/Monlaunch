import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades, tokens } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/tokens/:address/trades
export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const rows = await db
      .select()
      .from(trades)
      .where(eq(trades.tokenAddress, params.address.toLowerCase()))
      .orderBy(desc(trades.createdAt))
      .limit(50);
    return NextResponse.json({ trades: rows });
  } catch (err) {
    return NextResponse.json({ trades: [] });
  }
}

// POST /api/tokens/:address/trades — index a trade event
export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const body = await req.json();
    const { traderAddress, type, monAmount, tokenAmount, txHash, blockNumber } = body;

    if (!traderAddress || !type || !monAmount || !tokenAmount || !txHash) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(trades)
      .values({
        tokenAddress: params.address.toLowerCase(),
        traderAddress: traderAddress.toLowerCase(),
        type,
        monAmount: String(monAmount),
        tokenAmount: String(tokenAmount),
        txHash,
        blockNumber: String(blockNumber ?? 0),
      })
      .onConflictDoNothing()
      .returning();

    // Increment trade count on token
    await db
      .update(tokens)
      .set({
        tradeCount: sql`trade_count + 1`,
        totalVolumeMon: sql`total_volume_mon::numeric + ${String(monAmount)}`,
        lastTradeAt: new Date(),
      })
      .where(eq(tokens.address, params.address.toLowerCase()))
      .catch(() => {}); // best-effort

    return NextResponse.json(inserted ?? { ok: true });
  } catch (err) {
    console.error("[POST /api/tokens/:address/trades]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
