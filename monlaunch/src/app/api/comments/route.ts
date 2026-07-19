import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/comments?tokenAddress=...
export async function GET(req: NextRequest) {
  try {
    const tokenAddress = req.nextUrl.searchParams.get("tokenAddress");
    if (!tokenAddress) {
      return NextResponse.json({ error: "tokenAddress required" }, { status: 400 });
    }
    const rows = await db
      .select()
      .from(comments)
      .where(eq(comments.tokenAddress, tokenAddress.toLowerCase()))
      .orderBy(desc(comments.createdAt))
      .limit(100);
    return NextResponse.json({ comments: rows });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/comments
export async function POST(req: NextRequest) {
  try {
    const { tokenAddress, authorAddress, content } = await req.json();

    if (!tokenAddress || !authorAddress || !content?.trim()) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (content.length > 500) {
      return NextResponse.json({ error: "Comment too long" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(comments)
      .values({
        tokenAddress: tokenAddress.toLowerCase(),
        authorAddress: authorAddress.toLowerCase(),
        content: content.trim(),
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (err) {
    console.error("[POST /api/comments]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
