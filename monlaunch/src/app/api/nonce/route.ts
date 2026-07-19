import { NextResponse } from "next/server";
import { generateNonce } from "siwe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/nonce — generate a SIWE nonce
export async function GET() {
  const nonce = generateNonce();
  return NextResponse.json({ nonce });
}
