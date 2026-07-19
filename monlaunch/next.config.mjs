/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.mypinata.cloud" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      { protocol: "https", hostname: "**.ipfs.nftstorage.link" },
    ],
  },
  webpack: (config) => {
    // Required for wagmi/viem in Next.js
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@x402/evm/upto/client",
      "@x402/evm/exact/client",
      "@x402/core/client",
      "@x402/svm/exact/client",
      "@x402/evm"
    );
    return config;
  },
};

export default nextConfig;