"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, adminNav, visibleNav, type NavItem } from "@/config/navigation";
import type { GuildEmblem } from "@/lib/guild/guildEmblem";
import { Logo } from "./Logo";

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  // "/guilda" também vale para as páginas dentro dela, mas não para o quadro do admin ("/quadro-guilda").
  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-raised text-gold before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-gold" : "text-muted hover:bg-raised hover:text-fg"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export function Sidebar({ onNavigate, isAdmin = false, emblem }: { onNavigate?: () => void; isAdmin?: boolean; emblem: GuildEmblem }) {
  const items = visibleNav.filter((item) => !item.adminOnly || isAdmin);
  const loose = items.filter((item) => !item.group);
  const sections = NAV_GROUPS.map((group) => ({ ...group, items: items.filter((item) => item.group === group.key) })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="px-2 pt-2">
        <Logo emblem={emblem} />
      </div>
      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {loose.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
        {sections.map((section) => (
          <div key={section.key} className="mt-4">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted/70">{section.label}</p>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line pt-4">
        <NavLink item={adminNav} onNavigate={onNavigate} />
      </div>
    </div>
  );
}
