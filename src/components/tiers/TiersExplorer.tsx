"use client";

import { useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeSelect } from "@/components/pokedex/TypeSelect";
import { tierColors, tierLabel, type TierKey } from "@/config/tiers";
import { formatBrlRange, formatKkRange } from "@/lib/money";
import { filterAndSortPrices, type PriceFilters, type PriceSort } from "@/lib/priceFilters";
import { countByTier, TIER_KEYS, tierKeyOf } from "@/lib/tierFilters";
import type { TierPriceMap } from "@/lib/supabase/catalog";
import { TIERS, type Pokemon } from "@/types/pokemon";

const PAGE_SIZE = 60;
const emptyFilters: PriceFilters = { query: "", tier: "", type: "", status: "all", sort: "list", direction: "asc" };
const selectClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg";
const rowColumns = "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.5fr)]";

const SORTS: { value: PriceSort; label: string }[] = [
  { value: "list", label: "Ordem da lista" },
  { value: "az", label: "Alfabética (A–Z)" },
  { value: "tier", label: "Tier (mais raro primeiro)" },
  { value: "kk", label: "Valor em KK (menor primeiro)" },
  { value: "brl", label: "Valor em R$ (menor primeiro)" },
];

function TierCard({
  tier, count, prices, active, onClick,
}: { tier: (typeof TIERS)[number]; count: number; prices: TierPriceMap[typeof tier]; active: boolean; onClick: () => void }) {
  const hasValue = prices && (prices.kk.min != null || prices.brl.min != null);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative overflow-hidden rounded-xl border bg-panel p-3.5 pt-4 text-left transition-colors hover:bg-raised ${
        active ? "border-gold ring-1 ring-gold" : "border-line"
      }`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tierColors[tier] }} />
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{tier}</span>
        <span className="text-xs tabular-nums text-muted">{count} Pokémon</span>
      </span>
      {hasValue ? (
        <dl className="mt-2.5 space-y-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">KK</dt>
            <dd className="text-sm font-semibold tabular-nums">{formatKkRange(prices.kk.min, prices.kk.max)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Reais</dt>
            <dd className="text-sm font-semibold tabular-nums">{formatBrlRange(prices.brl.min, prices.brl.max)}</dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2.5 text-sm text-muted">Valor a definir</p>
      )}
    </button>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-0.5 text-xs text-muted md:hidden">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Value({ text, own, title }: { text: string | null; own: boolean; title: string }) {
  if (text == null) return <span className="text-muted">—</span>;
  return (
    <span title={title} className={`tabular-nums ${own ? "font-semibold text-gold" : "font-medium"}`}>
      {text}
    </span>
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
        <Cell label="Tier">
          <span className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColors[key] }} />
            <span className={key === "undefined" ? "text-muted" : ""}>{tierLabel(key)}</span>
          </span>
        </Cell>
        <Cell label="Tipo">{p.listedType ? <TypeBadge type={p.listedType} /> : <span className="text-muted">—</span>}</Cell>
        <Cell label="KK">
          <Value
            text={p.priceKk == null ? null : formatKkRange(p.priceKk, p.priceKkMax)}
            own={!p.priceKkFromTier}
            title={p.priceKkFromTier ? `Faixa do tier ${tierLabel(key)}` : "Valor específico deste Pokémon"}
          />
        </Cell>
        <Cell label="Reais">
          <Value
            text={p.priceBrl == null ? null : formatBrlRange(p.priceBrl, p.priceBrlMax)}
            own={!p.priceBrlFromTier}
            title={p.priceBrlFromTier ? `Faixa do tier ${tierLabel(key)}` : "Valor específico deste Pokémon"}
          />
        </Cell>
      </dl>
    </li>
  );
}

export function TiersExplorer({ pokemon, tierPrices }: { pokemon: Pokemon[]; tierPrices: TierPriceMap }) {
  const [filters, setFilters] = useState<PriceFilters>(emptyFilters);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const totals = useMemo(() => countByTier(pokemon), [pokemon]);
  const results = useMemo(() => filterAndSortPrices(pokemon, filters), [pokemon, filters]);
  const hasOwnPrice = useMemo(() => pokemon.some((p) => (p.priceKk != null && !p.priceKkFromTier) || (p.priceBrl != null && !p.priceBrlFromTier)), [pokemon]);
  const hasFilters = filters.query !== "" || filters.tier !== "" || filters.type !== "";

  const set = (patch: Partial<PriceFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisible(PAGE_SIZE);
  };
  const pickTier = (key: TierKey) => set({ tier: filters.tier === key ? "" : key });

  const clearButton = (
    <button
      type="button"
      onClick={() => {
        setFilters(emptyFilters);
        setVisible(PAGE_SIZE);
      }}
      className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      Limpar busca e filtros
    </button>
  );

  return (
    <div className="space-y-8">
      <section aria-labelledby="tier-cards-title">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h2 id="tier-cards-title" className="text-lg font-semibold">Quanto vale cada tier</h2>
          <p className="text-sm text-muted">Valores aproximados: variam dentro da faixa. Clique num tier para ver os Pokémon.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <TierCard
              key={tier}
              tier={tier}
              count={totals[tier]}
              prices={tierPrices[tier]}
              active={filters.tier === tier}
              onClick={() => pickTier(tier)}
            />
          ))}
        </div>
        {totals.undefined > 0 && (
          <button
            type="button"
            onClick={() => pickTier("undefined")}
            aria-pressed={filters.tier === "undefined"}
            className={`mt-3 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filters.tier === "undefined" ? "border-gold text-gold" : "border-line text-muted hover:text-fg"
            }`}
          >
            {totals.undefined} Pokémon ainda sem tier definido
          </button>
        )}
      </section>

      <section aria-labelledby="pokemon-list-title" className="space-y-4">
        <h2 id="pokemon-list-title" className="text-lg font-semibold">Pokémon</h2>

        <div className="grid gap-4 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1.5 block text-sm text-muted">Buscar por nome</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => set({ query: e.target.value })}
                placeholder="Ex.: Shiny Charizard"
                className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
              />
            </span>
          </label>
          <TypeSelect label="Tipo" value={filters.type} onChange={(type) => set({ type })} />
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Ordenar por</span>
            <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as PriceSort })} className={selectClass}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {results.length} de {pokemon.length} Pokémon
          </p>
          {filters.tier !== "" && (
            <button
              type="button"
              onClick={() => set({ tier: "" })}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 py-1 pl-3 pr-2 text-sm text-gold"
            >
              {tierLabel(filters.tier)} <X className="size-3.5" aria-label="Tirar filtro de tier" />
            </button>
          )}
          {hasFilters && results.length > 0 && <span className="ml-auto">{clearButton}</span>}
        </div>

        {results.length > 0 ? (
          <div>
            <div aria-hidden className={`mb-2 hidden gap-x-4 px-4 text-xs text-muted md:grid ${rowColumns}`}>
              <span>Pokémon</span>
              <span>Tier</span>
              <span>Tipo</span>
              <span>Valor em KK</span>
              <span>Valor em reais</span>
            </div>
            <ul className="space-y-2">
              {results.slice(0, visible).map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </ul>
            {visible < results.length && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-sm text-muted">Mostrando {visible} de {results.length}</p>
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-lg border border-line bg-raised px-5 py-2.5 text-sm font-medium hover:border-gold/50 hover:text-gold"
                >
                  Mostrar mais
                </button>
              </div>
            )}
            {hasOwnPrice && (
              <p className="mt-4 text-xs text-muted">
                Valores em <span className="font-semibold text-gold">dourado</span> são preços específicos do Pokémon; os demais seguem a faixa do tier.
              </p>
            )}
          </div>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nenhum Pokémon encontrado"
            description="Nada corresponde à busca e aos filtros atuais. Tente outro nome ou remova algum filtro."
            action={clearButton}
          />
        )}
      </section>
    </div>
  );
}
