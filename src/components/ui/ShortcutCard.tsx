import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { NavItem } from "@/config/navigation";

export function ShortcutCard({ href, label, description, icon: Icon }: NavItem) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-line bg-panel p-4 transition-colors hover:border-gold/50 hover:bg-raised"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-raised text-gold group-hover:bg-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block truncate text-sm text-muted">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
