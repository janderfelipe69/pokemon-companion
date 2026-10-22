"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeSelect } from "@/components/pokedex/TypeSelect";
import { tierColors, tierLabel } from "@/config/tiers";
import { countByTier, groupByTier, TIER_KEYS, type TierFilters, type TierSort } from "@/lib/tierFilters";
import type { Pokemon } from "@/types/pokemon";

const emptyFilters: TierFilters = { query: "", tier: "", type: "", sort: "list" };
const selectClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg";

export function TiersBrowser({ pokemon }: { pokemon: Pokemon[] }) {
  const [filters, setFilters] = useState<TierFilters>(emptyFilters);
  const totals = useMemo(() => countByTier(pokemon), [pokemon]);
  const { total, groups } = useMemo(() => groupByTier(pokemon, filters), [pokemon, filters]);
  const hasFilters = filters.query !== "" || filters.tier !== "" || filters.type !== "";

  const clearButton = (
    <button
      type="button"
      onClick={() => setFilters(emptyFilters)}
      className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      Limpar busca e filtros
    </button>
  );

  return (
    <div className="space-y-6">
      <section aria-label="Contagem por tier" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {TIER_KEYS.map((key) => {
          const active = filters.tier === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilters({ ...filters, tier: active ? "" : key })}
              className={`rounded-lg border bg-panel px-3 py-2 text-left transition-colors hover:bg-raised ${
                active ? "border-gold" : "border-line"
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColors[key] }} />
                <span className="truncate">{tierLabel(key)}</span>
              </span>
              <span className="mt-0.5 block text-lg font-semibold tabular-nums">{totals[key]}</span>
            </button>
          );
        })}
      </section>

      <div className="grid gap-4 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1.5 block text-sm text-muted">Buscar por nome</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Digite o nome do Pokémon"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Tier</span>
          <select
            value={filters.tier}
            onChange={(e) => setFilters({ ...filters, tier: e.target.value as TierFilters["tier"] })}
            className={selectClass}
          >
            <option value="">Todos os tiers</option>
            {TIER_KEYS.map((key) => (
              <option key={key} value={key}>
                {tierLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <TypeSelect label="Tipo" value={filters.type} onChange={(type) => setFilters({ ...filters, type })} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Ordem</span>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value as TierSort })}
            className={selectClass}
          >
            <option value="list">Ordem da lista</option>
            <option value="az">Alfabética (A–Z)</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {total} de {pokemon.length} Pokémon
        </p>
        {hasFilters && total > 0 && clearButton}
      </div>

      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map(({ key, items }) => (
            <details
              key={key}
              open
              className="group rounded-xl border border-l-4 border-line bg-panel"
              style={{ borderLeftColor: tierColors[key] }}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <h2 className="font-semibold">{tierLabel(key)}</h2>
                <Badge>{items.length}</Badge>
                <ChevronDown className="ml-auto size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="grid gap-2 border-t border-line p-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-raised px-3 py-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    {p.variant && <Badge tone="gold">{p.variant}</Badge>}
                    <span className="ml-auto">
                      {p.listedType ? <TypeBadge type={p.listedType} /> : <Badge>Tipo não definido</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum Pokémon encontrado"
          description="Nada corresponde à busca e aos filtros atuais. Tente outro nome ou remova algum filtro."
          action={clearButton}
        />
      )}
    </div>
  );
}
