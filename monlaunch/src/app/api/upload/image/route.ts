import { NextRequest, NextResponse } from "next/server";
import { uploadImageToIPFS } from "@/lib/pinata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be under 5 MB" },
        { status: 400 }
      );
    }

    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    if (!allowed.includes(image.type)) {
      return NextResponse.json(
        { error: "Image must be PNG, JPG, GIF, or WEBP" },
        { status: 400 }
      );
    }

    const ext = image.type.split("/")[1] ?? "jpg";
    const fileName = `token-${Date.now()}.${ext}`;
    const imageIpfsUri = await uploadImageToIPFS(image, fileName);

    const gateway =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud";
    const imageUrl = imageIpfsUri.startsWith("ipfs://")
      ? `${gateway}/ipfs/${imageIpfsUri.slice(7)}`
      : imageIpfsUri;

    return NextResponse.json({ imageUrl, imageIpfsUri });
  } catch (err) {
    console.error("[POST /api/upload/image]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image upload failed" },
      { status: 500 }
    );
  }
}
