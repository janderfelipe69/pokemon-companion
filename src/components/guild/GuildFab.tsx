"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem } from "lucide-react";

/** Botão flutuante da guilda: leva para a página /guilda (que pede login). Some no admin e dentro da própria guilda. */
export function GuildFab() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/guilda") || pathname?.startsWith("/quadro-guilda")) return null;

  return (
    <Link
      href="/guilda"
      aria-label="Abrir a área da guilda"
      title="Guilda"
      className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold px-4 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/50 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
    >
      <Gem className="size-5" aria-hidden />
      <span className="hidden sm:inline">Guilda</span>
    </Link>
  );
}
