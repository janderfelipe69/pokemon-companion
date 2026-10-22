"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav, mainNav, type NavItem } from "@/config/navigation";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "./Logo";

function NavLink({ item, onNavigate, soon }: { item: NavItem; onNavigate?: () => void; soon?: boolean }) {
  const pathname = usePathname();
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-raised text-gold" : "text-muted hover:bg-raised hover:text-fg"
      }`}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {soon && <Badge>Em breve</Badge>}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-2">
        <Logo />
      </div>
      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="border-t border-line pt-4">
        <NavLink item={adminNav} onNavigate={onNavigate} soon />
      </div>
    </div>
  );
}
