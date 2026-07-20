import { NextRequest, NextResponse } from "next/server";
import { uploadMetadataToIPFS } from "@/lib/pinata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, symbol, description, imageIpfsUri } = body;

    if (!name || !symbol || !imageIpfsUri) {
      return NextResponse.json(
        { error: "name, symbol, and imageIpfsUri are required" },
        { status: 400 }
      );
    }

    const metadataUri = await uploadMetadataToIPFS({
      name,
      symbol,
      description: description || "",
      image: imageIpfsUri,
      attributes: [
        { trait_type: "Network", value: "Monad Testnet" },
        { trait_type: "Platform", value: "MonLaunch" },
      ],
    });

    return NextResponse.json({ metadataUri });
  } catch (err) {
    console.error("[POST /api/upload/metadata]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Metadata upload failed" },
      { status: 500 }
    );
  }
}
