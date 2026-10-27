"use client";

import { Search } from "lucide-react";
import { tierColors } from "@/config/tiers";
import { HUNT_TIERS } from "@/config/teamPresets";
import type { PokedexEntry } from "@/types/pokedex";
import type { Tier } from "@/types/pokemon";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";

type Props = {
  targets: PokedexEntry[];
  selectedId: string | null;
  query: string;
  tier: Tier | "";
  onQuery: (q: string) => void;
  onTier: (t: Tier | "") => void;
  onSelect: (id: string) => void;
  /** Chips de tier mostrados (padrão: Mythic, Legendary e Ultra Rare). */
  tiers?: readonly Tier[];
  placeholder?: string;
  /** Linha extra embaixo do tier (ex.: de qual caça Sealed o Mega cai). */
  noteOf?: (entry: PokedexEntry) => string | null;
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`;

export function TargetPicker({ targets, selectedId, query, tier, onQuery, onTier, onSelect, tiers = HUNT_TIERS, placeholder = "Buscar Pokémon para caçar", noteOf }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
          />
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tier">
          <button type="button" className={chip(tier === "")} onClick={() => onTier("")} aria-pressed={tier === ""}>
            Todos
          </button>
          {tiers.map((t) => (
            <button key={t} type="button" className={chip(tier === t)} onClick={() => onTier(t)} aria-pressed={tier === t}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhum Pokémon encontrado para essa busca.</p>
      ) : (
        <div className="grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {targets.map((entry) => {
            const { pokemon: p } = entry;
            const selected = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                aria-pressed={selected}
                className={`flex flex-col overflow-hidden rounded-xl border bg-raised text-left transition-colors ${selected ? "border-gold ring-1 ring-gold" : "border-line hover:border-gold/50"}`}
              >
                <PokemonImage key={entry.image?.src} src={entry.image?.src ?? null} alt={p.sourceName ?? p.name} />
                <div className="space-y-2 p-2.5">
                  <p className="text-sm font-semibold leading-snug">{p.sourceName ?? p.name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="size-2 rounded-full" style={{ backgroundColor: tierColors[p.tier ?? "undefined"] }} />
                    {p.tier}
                  </p>
                  {noteOf?.(entry) && <p className="text-[11px] leading-snug text-muted">{noteOf(entry)}</p>}
                  <div className="flex flex-wrap gap-1">{entry.originalTypes?.map((t) => <TypeBadge key={t} type={t} />)}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
