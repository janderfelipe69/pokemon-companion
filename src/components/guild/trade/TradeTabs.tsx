"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, Medal } from "lucide-react";

const tabs = [
  { href: "/guilda/troca/medalhas", label: "Troca de medalhas", icon: Medal },
  { href: "/guilda/troca/boosts", label: "Troca de boosts", icon: Gem },
];

/** As duas funções de troca da guilda. */
export function TradeTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tipos de troca" className="mb-6 flex flex-wrap gap-2 border-b border-line pb-4">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${active ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
