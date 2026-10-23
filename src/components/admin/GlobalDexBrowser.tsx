"use client";

import { useMemo, useState } from "react";
import { Check, Search, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { dexVariants, entryImageUrl, entryTitle } from "@/lib/globalDex";
import { normalize } from "@/lib/pokemonFilters";
import type { GlobalDexEntry } from "@/types/globalDex";

const PAGE_SIZE = 48;
const selectClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg";

type Props = {
  dex: GlobalDexEntry[];
  /** IDs que já estão no catálogo (inclui os "shiny-..."). */
  registeredIds: Set<string>;
  onPick: (entry: GlobalDexEntry) => void;
};

/** Pokédex global: todas as formas disponíveis. Clicar em uma abre o cadastro já preenchido. */
export function GlobalDexBrowser({ dex, registeredIds, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const variants = useMemo(() => dexVariants(dex), [dex]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return dex.filter((e) => {
      if (form === "__normal" && e.variant) return false;
      if (form && form !== "__normal" && e.variant !== form) return false;
      if (onlyNew && registeredIds.has(e.id)) return false;
      if (!q) return true;
      return normalize(entryTitle(e)).includes(q) || String(e.dex) === q || e.id.includes(q);
    });
  }, [dex, query, form, onlyNew, registeredIds]);

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Buscar por nome ou número da Pokédex</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); reset(); }}
              placeholder="Ex.: Togekiss, Alolan Vulpix, 175…"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Forma</span>
          <select value={form} onChange={(e) => { setForm(e.target.value); reset(); }} className={selectClass}>
            <option value="">Todas</option>
            <option value="__normal">Normal</option>
            {variants.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">{results.length} de {dex.length} formas</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyNew} onChange={(e) => { setOnlyNew(e.target.checked); reset(); }} className="size-4 accent-[#f2b84b]" />
          Ocultar os que já estão no catálogo
        </label>
      </div>

      {results.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhum Pokémon encontrado" description="Tente outro nome, número ou forma." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, visible).map((e) => {
              const has = registeredIds.has(e.id);
              const hasShiny = registeredIds.has(`shiny-${e.id}`);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onPick(e)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-panel text-left transition-colors hover:border-gold/50"
                >
                  <PokemonImage key={e.id} src={entryImageUrl(e, false)} alt={entryTitle(e)} />
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div>
                      <p className="text-xs text-muted tabular-nums">#{e.dex}</p>
                      <h3 className="font-semibold leading-snug">{entryTitle(e)}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.types.map((t) => <TypeBadge key={t} type={t} />)}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1 pt-1">
                      {has && <Badge tone="teal"><Check className="mr-1 size-3" aria-hidden />No catálogo</Badge>}
                      {hasShiny && <Badge tone="gold"><Check className="mr-1 size-3" aria-hidden />Shiny</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          {visible < results.length && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted">Mostrando {Math.min(visible, results.length)} de {results.length}</p>
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
      )}
    </div>
  );
}
