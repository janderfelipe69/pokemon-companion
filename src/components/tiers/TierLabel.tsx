import { tierColors, tierLabel } from "@/config/tiers";
import { tierKeyOf } from "@/lib/tierFilters";
import type { Pokemon } from "@/types/pokemon";

export function TierLabel({ pokemon }: { pokemon: Pokemon }) {
  const key = tierKeyOf(pokemon);
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColors[key] }} />
      <span className={key === "undefined" ? "text-muted" : ""}>{tierLabel(key)}</span>
    </span>
  );
}
