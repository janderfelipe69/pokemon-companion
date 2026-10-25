"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { DropsDialog } from "@/components/drops/DropsDialog";
import { useDropsNav } from "@/components/drops/useDropsNav";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { tierLabel } from "@/config/tiers";
import {
  emptyPokedexFilters, filterEntries, hasPokedexFilters, NORMAL_VARIANT, variantOptions, type PokedexFilters,
} from "@/lib/pokedexFilters";
import { indexDrops, type DropsClientData } from "@/lib/drops/types";
import { TIER_KEYS } from "@/lib/tierFilters";
import type { PokedexEntry } from "@/types/pokedex";
import { PokemonCard } from "./PokemonCard";
import { PokemonDetail } from "./PokemonDetail";
import { TypeSelect } from "./TypeSelect";

const PAGE_SIZE = 48;
const selectClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg";

export function PokedexBrowser({ entries, drops }: { entries: PokedexEntry[]; drops?: DropsClientData }) {
  const [filters, setFilters] = useState<PokedexFilters>(emptyPokedexFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dropsNav = useDropsNav();
  const dropsIndex = useMemo(() => (drops ? indexDrops(drops) : undefined), [drops]);

  const variants = useMemo(() => variantOptions(entries), [entries]);
  const results = useMemo(() => filterEntries(entries, filters), [entries, filters]);
  const selected = entries.find((e) => e.pokemon.id === selectedId) ?? null;

  const update = (patch: Partial<PokedexFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  };
  const clear = () => {
    setFilters(emptyPokedexFilters);
    setVisible(PAGE_SIZE);
  };

  const clearButton = (
    <button
      type="button"
      onClick={clear}
      className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      Limpar busca e filtros
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1.5 block text-sm text-muted">Buscar por nome</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder="Ex.: Shiny Blaziken"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <TypeSelect label="Tipo original" value={filters.originalType} onChange={(originalType) => update({ originalType })} />
        <TypeSelect label="Tipo ofensivo das skills" value={filters.offensiveType} onChange={(offensiveType) => update({ offensiveType })} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Tier</span>
          <select value={filters.tier} onChange={(e) => update({ tier: e.target.value as PokedexFilters["tier"] })} className={selectClass}>
            <option value="">Todos os tiers</option>
            {TIER_KEYS.map((key) => (
              <option key={key} value={key}>
                {tierLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Variante</span>
          <select value={filters.variant} onChange={(e) => update({ variant: e.target.value })} className={selectClass}>
            <option value="">Todas as variantes</option>
            <option value={NORMAL_VARIANT}>Normal (sem variante)</option>
            {variants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length} de {entries.length} Pokémon
        </p>
        {hasPokedexFilters(filters) && results.length > 0 && clearButton}
      </div>

      {results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, visible).map((entry) => (
              <PokemonCard key={entry.pokemon.id} entry={entry} onSelect={() => setSelectedId(entry.pokemon.id)} />
            ))}
          </div>
          {visible < results.length && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted">
                Mostrando {Math.min(visible, results.length)} de {results.length}
              </p>
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-lg border border-line bg-raised px-5 py-2.5 text-sm font-medium hover:border-gold/50 hover:text-gold"
              >
                Mostrar mais
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum Pokémon encontrado"
          description="Nada corresponde à busca e aos filtros atuais. Tente outro nome ou remova algum filtro."
          action={clearButton}
        />
      )}

      <Dialog open={selected !== null} onClose={() => setSelectedId(null)} title={selected?.pokemon.sourceName ?? "Detalhes do Pokémon"}>
        {selected && <PokemonDetail entry={selected} drops={dropsIndex} onOpenItem={(id) => dropsNav.open({ kind: "item", id })} />}
      </Dialog>
      {drops && <DropsDialog data={drops} nav={dropsNav} />}
    </div>
  );
}
