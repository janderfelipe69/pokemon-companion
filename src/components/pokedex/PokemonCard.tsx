import { Badge } from "@/components/ui/Badge";
import { TierLabel } from "@/components/tiers/TierLabel";
import { formatBrl, formatKk } from "@/lib/money";
import type { PokedexEntry } from "@/types/pokedex";
import { PokemonImage } from "./PokemonImage";
import { OFFENSIVE_EMPTY, OFFENSIVE_TITLE, ORIGINAL_EMPTY, ORIGINAL_TITLE, TypeGroup } from "./TypeGroup";

export function PokemonCard({ entry, onSelect }: { entry: PokedexEntry; onSelect: () => void }) {
  const { pokemon: p } = entry;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-gold/50"
    >
      <PokemonImage key={entry.image?.src} src={entry.image?.src ?? null} alt={p.sourceName ?? p.name} />
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold leading-snug">{p.name}</h3>
          {p.variant && <Badge tone="gold">{p.variant}</Badge>}
        </div>
        <TypeGroup title={ORIGINAL_TITLE} types={entry.originalTypes} emptyText={ORIGINAL_EMPTY} />
        <TypeGroup title={OFFENSIVE_TITLE} types={entry.offensiveTypes} emptyText={OFFENSIVE_EMPTY} />
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3">
          <TierLabel pokemon={p} />
          {p.priceKk != null && <span className="text-sm font-medium tabular-nums">{formatKk(p.priceKk)}</span>}
          {p.priceBrl != null && <span className="text-sm font-medium tabular-nums">{formatBrl(p.priceBrl)}</span>}
        </div>
      </div>
    </button>
  );
}
