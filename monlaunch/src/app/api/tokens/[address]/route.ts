import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/tokens/:address
export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const [token] = await db
      .select()
      .from(tokens)
      .where(eq(tokens.address, params.address.toLowerCase()))
      .limit(1);

    if (!token) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(token);
  } catch (err) {
    console.error("[GET /api/tokens/:address]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/tokens/:address — update cached on-chain state (called after trades)
export async function PUT(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const body = await req.json();
    const { monReserve, tokenReserve, realMonRaised, graduated, totalVolumeMon } = body;

    await db
      .update(tokens)
      .set({
        ...(monReserve !== undefined && { monReserve: String(monReserve) }),
        ...(tokenReserve !== undefined && { tokenReserve: String(tokenReserve) }),
        ...(realMonRaised !== undefined && { realMonRaised: String(realMonRaised) }),
        ...(graduated !== undefined && { graduated }),
        ...(totalVolumeMon !== undefined && { totalVolumeMon: String(totalVolumeMon) }),
        lastTradeAt: new Date(),
      })
      .where(eq(tokens.address, params.address.toLowerCase()));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/tokens/:address]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
