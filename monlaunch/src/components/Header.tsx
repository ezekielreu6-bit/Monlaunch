"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Rocket, TrendingUp, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Explore", href: "/", icon: LayoutGrid },
  { label: "Leaderboard", href: "/leaderboard", icon: TrendingUp },
];

export default function Header() {
  const path = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:glow-purple transition-all">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-text-primary">
            Mon<span className="text-primary-light">Launch</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                path === href
                  ? "bg-surface-2 text-text-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all hover:glow-purple"
          >
            <Plus className="w-4 h-4" />
            Launch Token
          </Link>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </div>
    </header>
  );
}
