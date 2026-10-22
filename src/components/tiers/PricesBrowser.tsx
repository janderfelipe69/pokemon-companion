"use client";

import { useMemo, useState } from "react";
import { Search, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeSelect } from "@/components/pokedex/TypeSelect";
import { tierColors, tierLabel } from "@/config/tiers";
import { formatBrl, formatKk, NOT_DEFINED } from "@/lib/money";
import { filterAndSortPrices, priceCounts, type PriceFilters } from "@/lib/priceFilters";
import { TIER_KEYS, tierKeyOf } from "@/lib/tierFilters";
import type { DecimalString, Pokemon } from "@/types/pokemon";

const emptyFilters: PriceFilters = { query: "", tier: "", type: "", status: "all", sort: "list", direction: "asc" };
const selectClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg";
const rowColumns = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]";

function Price({ value, format }: { value: DecimalString | null | undefined; format: (v: DecimalString | null | undefined) => string }) {
  return value == null ? (
    <span className="text-sm text-muted">{NOT_DEFINED}</span>
  ) : (
    <span className="text-sm font-medium tabular-nums">{format(value)}</span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-xs text-muted md:hidden">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Row({ p }: { p: Pokemon }) {
  const key = tierKeyOf(p);
  return (
    <li className={`grid gap-x-4 gap-y-3 rounded-lg border border-line bg-panel px-4 py-3 md:items-center ${rowColumns}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-medium">{p.name}</span>
        {p.variant && <Badge tone="gold">{p.variant}</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-3 md:contents">
        <Field label="Tier">
          <span className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColors[key] }} />
            {tierLabel(key)}
          </span>
        </Field>
        <Field label="Tipo">{p.listedType ? <TypeBadge type={p.listedType} /> : <Badge>Tipo não definido</Badge>}</Field>
        <Field label="Preço em KK">
          <Price value={p.priceKk} format={formatKk} />
        </Field>
        <Field label="Preço em R$">
          <Price value={p.priceBrl} format={formatBrl} />
        </Field>
      </dl>
    </li>
  );
}

export function PricesBrowser({ pokemon }: { pokemon: Pokemon[] }) {
  const [filters, setFilters] = useState<PriceFilters>(emptyFilters);
  const set = (patch: Partial<PriceFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const counts = useMemo(() => priceCounts(pokemon), [pokemon]);
  const results = useMemo(() => filterAndSortPrices(pokemon, filters), [pokemon, filters]);
  const hasFilters = filters.query !== "" || filters.tier !== "" || filters.type !== "" || filters.status !== "all";
  const numericSort = filters.sort === "kk" || filters.sort === "brl";

  const clearButton = (
    <button
      type="button"
      onClick={() => setFilters(emptyFilters)}
      className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      Limpar busca e filtros
    </button>
  );

  const stats = [
    { label: "Com preço", value: counts.withAny },
    { label: "Sem preço", value: counts.withoutAny },
    { label: "Com preço em KK", value: counts.withKk },
    { label: "Com preço em R$", value: counts.withBrl },
  ];

  return (
    <div className="space-y-6">
      <section aria-label="Preços cadastrados" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1.5 block text-sm text-muted">Buscar por nome</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set({ query: e.target.value })}
              placeholder="Digite o nome do Pokémon"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Tier</span>
          <select value={filters.tier} onChange={(e) => set({ tier: e.target.value as PriceFilters["tier"] })} className={selectClass}>
            <option value="">Todos os tiers</option>
            {TIER_KEYS.map((key) => (
              <option key={key} value={key}>
                {tierLabel(key)}
              </option>
            ))}
          </select>
        </label>
        <TypeSelect label="Tipo" value={filters.type} onChange={(type) => set({ type })} />
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Preço</span>
          <select value={filters.status} onChange={(e) => set({ status: e.target.value as PriceFilters["status"] })} className={selectClass}>
            <option value="all">Todos</option>
            <option value="with">Somente com preço</option>
            <option value="without">Somente sem preço</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Ordenar por</span>
          <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as PriceFilters["sort"] })} className={selectClass}>
            <option value="list">Ordem da lista</option>
            <option value="az">Alfabética (A–Z)</option>
            <option value="kk">Preço em KK</option>
            <option value="brl">Preço em R$</option>
          </select>
        </label>
        {numericSort && (
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Direção</span>
            <select value={filters.direction} onChange={(e) => set({ direction: e.target.value as PriceFilters["direction"] })} className={selectClass}>
              <option value="asc">Crescente (menor primeiro)</option>
              <option value="desc">Decrescente (maior primeiro)</option>
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length} de {pokemon.length} Pokémon
          {numericSort && " · preços não definidos ficam no fim"}
        </p>
        {hasFilters && results.length > 0 && clearButton}
      </div>

      {results.length > 0 ? (
        <div>
          <div
            aria-hidden
            className={`mb-2 hidden gap-x-4 px-4 text-xs text-muted md:grid ${rowColumns}`}
          >
            <span>Pokémon</span>
            <span>Tier</span>
            <span>Tipo</span>
            <span>Preço em KK</span>
            <span>Preço em R$</span>
          </div>
          <ul className="space-y-2">
            {results.map((p) => (
              <Row key={p.id} p={p} />
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum Pokémon encontrado"
          description={
            filters.status === "with" && counts.withAny === 0
              ? "Nenhum preço foi cadastrado ainda. Os Pokémon continuam listados em “Todos” ou “Somente sem preço”."
              : "Nada corresponde à busca e aos filtros atuais. Tente outro nome ou remova algum filtro."
          }
          action={clearButton}
        />
      )}
    </div>
  );
}
