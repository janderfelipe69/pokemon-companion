"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ItemImage } from "@/components/talents/ItemImage";
import { normalizeText } from "@/lib/talents/items";
import { indexDrops, type DropsClientData } from "@/lib/drops/types";

type Filter = "all" | "with" | "without";

/** Todos os itens, com busca por nome e filtro "com / sem Pokémon que dropa". Clicar abre quem dropa. */
export function ItemsBrowser({ data, onOpenItem }: { data: DropsClientData; onOpenItem: (itemId: number) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const index = useMemo(() => indexDrops(data), [data]);
  const countOf = (itemId: number) => new Set((index.byItem.get(itemId) ?? []).map((r) => r.pokemonId)).size;

  const withCount = data.items.filter((i) => countOf(i.id) > 0).length;
  const visible = useMemo(() => {
    const q = normalizeText(query);
    return data.items.filter((i) => {
      if (q && !normalizeText(i.name).includes(q)) return false;
      const n = new Set((index.byItem.get(i.id) ?? []).map((r) => r.pokemonId)).size;
      return filter === "all" || (filter === "with" ? n > 0 : n === 0);
    });
  }, [data.items, index, query, filter]);

  const chip = (key: Filter, label: string, count: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        filter === key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
      }`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );

  if (data.items.length === 0) return <p className="rounded-xl border border-line bg-panel p-5 text-sm text-muted">Ainda não há itens cadastrados.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1 sm:max-w-md">
          <span className="mb-1.5 block text-sm text-muted">Buscar item pelo nome</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: earth ball"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted/60"
            />
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {chip("all", "Todos", data.items.length)}
          {chip("with", "Com Pokémon", withCount)}
          {chip("without", "Sem Pokémon", data.items.length - withCount)}
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        Mostrando {visible.length} de {data.items.length} itens · clique num item para ver quais Pokémon dropam
      </p>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
          {visible.map((item) => {
            const n = countOf(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className="flex h-full w-full flex-col items-center gap-1.5 rounded-xl border border-line bg-panel p-2.5 text-center transition-colors hover:border-gold/50 hover:bg-white/5"
                >
                  <ItemImage path={item.imagePath} name={item.name} className="size-14" />
                  <span className="line-clamp-2 w-full break-words text-xs font-medium leading-tight">{item.name}</span>
                  <span className={`text-[10px] ${n === 0 ? "text-amber-300" : "text-muted"}`}>{n === 0 ? "sem Pokémon" : `${n} ${n === 1 ? "Pokémon" : "Pokémon"}`}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum item encontrado.</p>
      )}
    </div>
  );
}
