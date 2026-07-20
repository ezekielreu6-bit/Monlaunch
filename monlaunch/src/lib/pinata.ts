// Server-side only — called from API routes, never from client components

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string; // ipfs:// URI of the image
  attributes?: { trait_type: string; value: string }[];
}

/**
 * Upload a file (image) to Pinata using the V3 Files API (faster than legacy
 * /pinning/pinFileToIPFS) and return the IPFS URI.
 */
export async function uploadImageToIPFS(
  file: File | Blob,
  fileName: string
): Promise<string> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");

  const form = new FormData();
  form.append("file", file, fileName);
  form.append("name", `monlaunch-${fileName}`);
  form.append("network", "public");

  // V3 dedicated upload endpoint — significantly faster than legacy pinning API
  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    // Fall back to legacy API if V3 errors (e.g. JWT doesn't have V3 scope)
    return uploadImageToIPFSLegacy(file, fileName, jwt, text);
  }

  const data = await res.json();
  const cid = data?.data?.cid;
  if (!cid) throw new Error(`Pinata V3 upload returned no CID: ${JSON.stringify(data)}`);
  return `ipfs://${cid}`;
}

/** Legacy fallback (only used if V3 fails) */
async function uploadImageToIPFSLegacy(
  file: File | Blob,
  fileName: string,
  jwt: string,
  v3Error: string
): Promise<string> {
  console.warn("[pinata] V3 upload failed, falling back to legacy API.", v3Error);
  const form = new FormData();
  form.append("file", file, fileName);
  form.append("pinataMetadata", JSON.stringify({ name: `monlaunch-${fileName}` }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

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
