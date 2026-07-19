import type { Metadata } from "next";
import CreateTokenForm from "@/components/CreateTokenForm";

export const metadata: Metadata = {
  title: "Launch Token — MonLaunch",
  description: "Create and launch your meme token on Monad Testnet with a bonding curve.",
};

export default function CreatePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-text-primary mb-2">Launch a Token</h1>
        <p className="text-text-secondary">
          Create a fair-launch token on Monad Testnet. A 0.01 MON fee is required to prevent spam.
          Your token starts trading immediately on a bonding curve.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-6">
        <CreateTokenForm />
      </div>
    </div>
  );
}
