import { NextRequest, NextResponse } from "next/server";
import { uploadImageToIPFS, uploadMetadataToIPFS } from "@/lib/pinata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const name = formData.get("name") as string;
    const symbol = formData.get("symbol") as string;
    const description = formData.get("description") as string;

    if (!image || !name || !symbol) {
      return NextResponse.json(
        { error: "image, name, and symbol are required" },
        { status: 400 }
      );
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be under 5 MB" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: "Image must be PNG, JPG, GIF, or WEBP" },
        { status: 400 }
      );
    }

    // 1. Upload image
    const imageIpfsUri = await uploadImageToIPFS(
      image,
      `${symbol.toLowerCase()}-${Date.now()}.${image.type.split("/")[1]}`
    );

    // 2. Upload metadata JSON
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

    // Resolve gateway URL for the image (for DB storage)
    const gateway =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
    const imageUrl = imageIpfsUri.startsWith("ipfs://")
      ? `${gateway}/ipfs/${imageIpfsUri.slice(7)}`
      : imageIpfsUri;

    return NextResponse.json({ imageUrl, metadataUri, imageIpfsUri });
  } catch (err) {
    console.error("[POST /api/upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
