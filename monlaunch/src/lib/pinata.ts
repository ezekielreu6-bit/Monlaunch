// Server-side only — called from API routes, never from client components

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // ipfs:// URI of the image
  attributes?: { trait_type: string; value: string }[];
}

/** Upload a file (image) to Pinata and return the IPFS URI */
export async function uploadImageToIPFS(
  file: File | Blob,
  fileName: string
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const form = new FormData();
  form.append("file", file, fileName);
  form.append(
    "pinataMetadata",
    JSON.stringify({ name: `monlaunch-image-${fileName}` })
  );
  form.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata image upload failed: ${text}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

/** Upload a metadata JSON object to Pinata and return the IPFS URI */
export async function uploadMetadataToIPFS(
  metadata: TokenMetadata
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataMetadata: { name: `monlaunch-metadata-${metadata.symbol}` },
      pinataOptions: { cidVersion: 1 },
      pinataContent: metadata,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata metadata upload failed: ${text}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}
