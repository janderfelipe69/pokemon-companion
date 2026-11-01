"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu } from "lucide-react";
import { GUILD } from "@/config/guild";
import { allNav } from "@/config/navigation";
import { TypeStrip } from "@/components/ui/TypeStrip";
import type { GuildEmblem } from "@/lib/guild/guildEmblem";
import { Logo } from "./Logo";

/** O item do menu que corresponde à página atual (o de endereço mais longo que combina). */
function currentItem(pathname: string) {
  return allNav
    .filter((item) => (item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function Header({ onOpenMenu, emblem }: { onOpenMenu: () => void; emblem: GuildEmblem }) {
  const pathname = usePathname();
  const current = currentItem(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur sm:px-8">
      <TypeStrip className="absolute inset-x-0 top-0 h-0.5" />
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-fg hover:bg-raised lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="lg:hidden">
          <Logo emblem={emblem} />
        </div>
        {/* No computador a marca já está no menu: aqui vai o caminho da página. */}
        <nav aria-label="Você está em" className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted">{GUILD.name}</span>
          {current && current.href !== "/" && (
            <>
              <ChevronRight className="size-4 text-line" aria-hidden />
              <span className="font-medium text-fg">{current.label}</span>
            </>
          )}
        </nav>
      </div>

      {emblem.banner && emblem.level !== null && (
        <Link href="/guilda" className="hidden shrink-0 items-center gap-2 rounded-full border border-gold/40 bg-gold/10 py-1 pl-1 pr-3 text-xs font-semibold text-gold transition-colors hover:border-gold sm:inline-flex" title={`Banner da guilda: ${emblem.banner.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
          <img src={emblem.src} alt="" width={24} height={24} className="size-6 rounded-full bg-ink object-contain p-0.5" />
          Guilda nível {emblem.level}
        </Link>
      )}
    </header>
  );
}
