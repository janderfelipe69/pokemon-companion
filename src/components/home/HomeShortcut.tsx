import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { NavItem } from "@/config/navigation";

const accents = {
  gold: {
    tile: "bg-gold/10 text-gold ring-gold/25",
    border: "hover:border-gold/50",
    arrow: "group-hover:text-gold",
  },
  teal: {
    tile: "bg-teal/10 text-teal ring-teal/25",
    border: "hover:border-teal/50",
    arrow: "group-hover:text-teal",
  },
} as const;

export type Accent = keyof typeof accents;

/** Atalho grande da página inicial: ícone em destaque, nome, descrição e seta. */
export function HomeShortcut({ item, accent }: { item: NavItem; accent: Accent }) {
  const { href, label, description, icon: Icon } = item;
  const a = accents[accent];
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-4 rounded-xl border border-line bg-panel p-4 transition-colors hover:bg-raised sm:flex-col sm:items-start sm:p-5 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 ${a.border}`}
    >
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ring-1 ${a.tile}`}>
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 pr-8 sm:pr-0">
        <span className="block text-lg font-semibold tracking-tight">{label}</span>
        <span className="mt-1 block text-sm text-muted">{description}</span>
      </span>
      <ArrowRight
        className={`absolute right-5 top-1/2 size-4 -translate-y-1/2 text-muted sm:top-6 sm:translate-y-0 transition-transform group-hover:translate-x-1 ${a.arrow}`}
        aria-hidden
      />
    </Link>
  );
}
