"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/tiers", label: "Por tier" },
  { href: "/tiers/valores", label: "Tabela de valores" },
];

export function TiersTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Visualizações" className="mb-6 flex w-fit gap-1 rounded-lg border border-line bg-panel p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-raised text-gold" : "text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
