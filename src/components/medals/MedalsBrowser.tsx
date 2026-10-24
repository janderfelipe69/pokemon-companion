"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Eraser, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MAX_EQUIPPED, MEDALS, MEDAL_BY_ID, MEDAL_CATEGORIES, MEDAL_STATS, statCategory, statLabel,
  type Medal, type MedalCategory, type MedalStatKey,
} from "@/data/medals";
import { computeTotals, countStats, emptyMedalFilters, filterMedals, hasMedalFilters, type MedalFilters } from "@/lib/medalFilters";
import { MedalBadge } from "./MedalBadge";
import { MedalRing } from "./MedalRing";

/** Cores por categoria (classes completas para o Tailwind enxergar). */
const CATEGORY_STYLE: Record<MedalCategory, { chipOn: string; chipOff: string; tile: string }> = {
  combate: { chipOn: "border-red-400 bg-red-500/25 text-red-100", chipOff: "border-red-500/30 text-red-200/80 hover:bg-red-500/10", tile: "border-red-500/40" },
  leech: { chipOn: "border-pink-400 bg-pink-500/25 text-pink-100", chipOff: "border-pink-500/30 text-pink-200/80 hover:bg-pink-500/10", tile: "border-pink-500/40" },
  defesa: { chipOn: "border-emerald-400 bg-emerald-500/25 text-emerald-100", chipOff: "border-emerald-500/30 text-emerald-200/80 hover:bg-emerald-500/10", tile: "border-emerald-500/40" },
  loot: { chipOn: "border-amber-400 bg-amber-500/25 text-amber-100", chipOff: "border-amber-500/30 text-amber-200/80 hover:bg-amber-500/10", tile: "border-amber-500/40" },
  shiny: { chipOn: "border-violet-400 bg-violet-500/25 text-violet-100", chipOff: "border-violet-500/30 text-violet-200/80 hover:bg-violet-500/10", tile: "border-violet-500/40" },
  velocidade: { chipOn: "border-sky-400 bg-sky-500/25 text-sky-100", chipOff: "border-sky-500/30 text-sky-200/80 hover:bg-sky-500/10", tile: "border-sky-500/40" },
};

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function StatChips({ medal, highlight }: { medal: Medal; highlight: MedalStatKey[] }) {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <span
        className={`rounded-full bg-emerald-600/90 px-2 py-0.5 text-center text-[11px] font-semibold leading-tight text-white ${
          highlight.includes(medal.plus) ? "ring-2 ring-white/80" : ""
        }`}
      >
        + {statLabel(medal.plus)}
      </span>
      {medal.minus ? (
        <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-center text-[11px] font-semibold leading-tight text-white">
          − {statLabel(medal.minus)}
        </span>
      ) : (
        <span className="rounded-full bg-slate-600/80 px-2 py-0.5 text-center text-[11px] font-semibold leading-tight text-slate-100">
          sem debuff
        </span>
      )}
    </div>
  );
}

function MedalTile({
  medal, selected, disabled, highlight, onToggle,
}: { medal: Medal; selected: boolean; disabled: boolean; highlight: MedalStatKey[]; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      disabled={disabled}
      title={disabled ? `Limite de ${MAX_EQUIPPED} medalhas atingido` : selected ? "Tirar da seleção" : "Adicionar à seleção"}
      className={`relative flex flex-col items-center gap-2 rounded-xl border bg-black/25 px-2 pb-3 pt-3 text-center transition-colors enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? "border-gold ring-2 ring-gold/70" : CATEGORY_STYLE[statCategory(medal.plus)].tile
      }`}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-gold text-ink">
          <Check className="size-3.5" aria-hidden />
        </span>
      )}
      <span className="absolute left-2 top-1.5 text-[10px] tabular-nums text-muted">#{medal.id}</span>
      <MedalBadge id={medal.id} className="mt-2 size-14" />
      <span className="text-sm font-semibold leading-tight">{medal.name}</span>
      <StatChips medal={medal} highlight={highlight} />
    </button>
  );
}

export function MedalsBrowser() {
  const [filters, setFilters] = useState<MedalFilters>(emptyMedalFilters);
  const [picked, setPicked] = useState<number[]>([]);

  const results = useMemo(() => filterMedals(MEDALS, filters), [filters]);
  const counts = useMemo(() => countStats(MEDALS), []);
  const equipped = useMemo(() => picked.map((id) => MEDAL_BY_ID.get(id)).filter((m): m is Medal => !!m), [picked]);
  const totals = useMemo(() => computeTotals(equipped), [equipped]);
  const full = picked.length >= MAX_EQUIPPED;

  const update = (patch: Partial<MedalFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const togglePick = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_EQUIPPED ? p : [...p, id]));

  // Só mostra como "preset" os buffs que alguma medalha realmente dá; idem para debuffs a evitar.
  const plusByCategory = MEDAL_CATEGORIES.map((c) => ({
    ...c,
    stats: (Object.keys(MEDAL_STATS) as MedalStatKey[]).filter((k) => statCategory(k) === c.key && counts.plus.has(k)),
  })).filter((c) => c.stats.length > 0);
  const avoidStats = (Object.keys(MEDAL_STATS) as MedalStatKey[]).filter((k) => counts.minus.has(k));
  const noDebuffCount = MEDALS.filter((m) => m.minus === null).length;

  const chip = (key: MedalStatKey, active: boolean, onClick: () => void, count: number) => {
    const style = CATEGORY_STYLE[statCategory(key)];
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? style.chipOn : style.chipOff}`}
      >
        {statLabel(key)} <span className="opacity-60">{count}</span>
      </button>
    );
  };

  const clearButton = (
    <button
      type="button"
      onClick={() => setFilters(emptyMedalFilters)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      <Eraser className="size-4" aria-hidden /> Limpar filtros
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Busca e presets */}
      <section className="medal-panel space-y-5 rounded-2xl p-4 sm:p-6" aria-label="Filtros">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1">
            <span className="mb-1.5 block text-sm text-muted">Buscar por Pokémon ou buff</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => update({ query: e.target.value })}
                placeholder="Ex.: Pikachu, 25, crit..."
                className="w-full rounded-lg border border-line bg-black/30 py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
              />
            </span>
          </label>
          <button
            type="button"
            onClick={() => update({ noDebuff: !filters.noDebuff })}
            aria-pressed={filters.noDebuff}
            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              filters.noDebuff ? "border-gold bg-gold/15 text-gold" : "border-line bg-black/30 text-muted hover:text-fg"
            }`}
          >
            Só sem debuff <span className="opacity-60">{noDebuffCount}</span>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted">
            <strong className="font-medium text-fg">Presets:</strong> escolha o que você quer (pode marcar vários) e veja só as medalhas que dão esse buff.
          </p>
          {plusByCategory.map((cat) => (
            <div key={cat.key} className="flex flex-wrap items-center gap-2">
              <span className="w-full text-[11px] font-semibold uppercase tracking-wider text-muted sm:w-36">{cat.label}</span>
              {cat.stats.map((k) => chip(k, filters.plus.includes(k), () => update({ plus: toggle(filters.plus, k) }), counts.plus.get(k) ?? 0))}
            </div>
          ))}
        </div>

        <details className="group rounded-lg border border-line/70 bg-black/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm text-muted hover:text-fg">
            <span>
              <strong className="font-medium text-fg">Evitar debuff</strong> — esconder medalhas que tiram…
              {filters.avoid.length > 0 && <span className="ml-2 text-gold">({filters.avoid.length} marcado{filters.avoid.length > 1 ? "s" : ""})</span>}
            </span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-line/70 p-3">
            {avoidStats.map((k) => chip(k, filters.avoid.includes(k), () => update({ avoid: toggle(filters.avoid, k) }), counts.minus.get(k) ?? 0))}
          </div>
        </details>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[19.5rem_minmax(0,1fr)]">
        {/* Estatísticas das medalhas escolhidas */}
        <aside className="medal-panel space-y-4 rounded-2xl p-4 lg:sticky lg:top-24" aria-label="Medalhas escolhidas">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Minha seleção</h2>
            <button
              type="button"
              onClick={() => setPicked([])}
              disabled={picked.length === 0}
              className="text-xs text-muted hover:text-gold disabled:opacity-40 disabled:hover:text-muted"
            >
              Limpar
            </button>
          </div>
          <MedalRing equipped={equipped} onRemove={togglePick} />

          <button
            type="button"
            onClick={() => setPicked(results.slice(0, MAX_EQUIPPED).map((m) => m.id))}
            disabled={results.length === 0}
            className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold disabled:opacity-40"
          >
            Usar as {Math.min(MAX_EQUIPPED, results.length)} primeiras do filtro
          </button>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-sky-200">Estatísticas das Medalhas</h3>
            {totals.length === 0 ? (
              <p className="text-sm text-muted">Clique nas medalhas ao lado (até {MAX_EQUIPPED}) para ver o total de buffs e debuffs.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {totals.map(({ key, value }) => (
                  <li key={key} className="flex items-center justify-between gap-3">
                    <span className="text-cyan-300">{statLabel(key)}</span>
                    <span className={`font-semibold tabular-nums ${value > 0 ? "text-green-400" : "text-red-400"}`}>
                      {value > 0 ? `+${value}` : `−${Math.abs(value)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted">Cada medalha vale ±1 unidade; o jogo converte essas unidades no valor final.</p>
          </div>
        </aside>

        {/* Lista de medalhas */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {results.length} de {MEDALS.length} medalhas
              {full && <span className="ml-2 text-gold">· limite de {MAX_EQUIPPED} atingido</span>}
            </p>
            {hasMedalFilters(filters) && results.length > 0 && clearButton}
          </div>

          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((m) => (
                <MedalTile
                  key={m.id}
                  medal={m}
                  selected={picked.includes(m.id)}
                  disabled={full && !picked.includes(m.id)}
                  highlight={filters.plus}
                  onToggle={() => togglePick(m.id)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="Nenhuma medalha encontrada"
              description="Nada corresponde à busca e aos filtros atuais. Tente remover algum preset."
              action={clearButton}
            />
          )}
        </div>
      </div>
    </div>
  );
}
