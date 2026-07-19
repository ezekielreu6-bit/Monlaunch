"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Flame, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "new", label: "New", icon: Clock },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "graduated", label: "Graduated", icon: Trophy },
];

export default function TokenFilters({ activeTab }: { activeTab: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 bg-surface border border-border rounded-xl p-1 w-fit">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => router.push(`/?tab=${id}`)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
            activeTab === id
              ? "bg-surface-2 text-text-primary shadow"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
