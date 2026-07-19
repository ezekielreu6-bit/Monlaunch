import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/providers/Providers";
import Header from "@/components/Header";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonLaunch — Monad Token Launcher",
  description:
    "Launch and trade meme tokens on Monad Testnet with a bonding curve. Fair launch, no pre-sale.",
  keywords: ["Monad", "token", "launch", "meme", "bonding curve", "DeFi"],
  openGraph: {
    title: "MonLaunch",
    description: "Launch tokens on Monad Testnet",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen bg-background">
            <Header />
            <main className="pt-16">{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#16162a",
                color: "#e2e8f0",
                border: "1px solid #1e1e38",
                borderRadius: "12px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
