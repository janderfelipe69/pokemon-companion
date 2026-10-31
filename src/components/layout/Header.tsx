import { Menu } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TypeStrip } from "@/components/ui/TypeStrip";
import { Logo } from "./Logo";

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 backdrop-blur sm:px-8">
      <TypeStrip className="absolute inset-x-0 top-0 h-0.5" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menu"
          className="flex size-10 items-center justify-center rounded-lg border border-line text-fg hover:bg-raised lg:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>
      </div>
      <Badge tone="gold">Em desenvolvimento</Badge>
    </header>
  );
}
