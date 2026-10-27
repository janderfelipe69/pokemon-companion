"use client";

import { useMemo, useState } from "react";
import { Info, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { tierColors } from "@/config/tiers";
import { megaName, sealedHuntOf } from "@/lib/sealed";
import { normalize } from "@/lib/pokemonFilters";
import type { PokedexEntry } from "@/types/pokedex";
import { TIERS, type Tier } from "@/types/pokemon";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`;

/** Megas: não têm caça própria, são DZ dropados das caças Sealed. Lista separada, por tier. */
export function SealedList({ entries }: { entries: PokedexEntry[] }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | "">("");

  const tiersPresent = useMemo(() => TIERS.filter((t) => entries.some((e) => e.pokemon.tier === t)), [entries]);
  const groups = useMemo(() => {
    const q = normalize(query);
    const shown = entries.filter((e) => (!tier || e.pokemon.tier === tier) && (!q || normalize(megaName(e.pokemon)).includes(q)));
    const byTier = new Map<string, PokedexEntry[]>();
    for (const e of shown) byTier.set(e.pokemon.tier ?? "undefined", [...(byTier.get(e.pokemon.tier ?? "undefined") ?? []), e]);
    const rank = (key: string) => (TIERS as readonly string[]).indexOf(key) >= 0 ? (TIERS as readonly string[]).indexOf(key) : TIERS.length;
    return [...byTier.entries()]
      .sort((a, b) => rank(a[0]) - rank(b[0]))
      .map(([key, list]) => ({ key, list: list.sort((a, b) => megaName(a.pokemon).localeCompare(megaName(b.pokemon), "pt-BR")) }));
  }, [entries, query, tier]);

  return (
    <Card>
      <p className="mb-5 flex items-start gap-2 rounded-lg border border-teal/30 bg-teal/5 p-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
        <span>
          Megas <strong className="font-medium text-fg">não têm caça própria</strong>: são DZ, dropados das caças <strong className="font-medium text-fg">Sealed</strong> (como a Sealed Scolipite ou a Sealed Mawilite). Por isso não entram no montador de times. A única Mega que é caça de verdade é a Clefable.
        </span>
      </p>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar Mega" aria-label="Buscar Mega" className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted" />
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tier">
          <button type="button" className={chip(tier === "")} onClick={() => setTier("")} aria-pressed={tier === ""}>Todos</button>
          {tiersPresent.map((t) => (
            <button key={t} type="button" className={chip(tier === t)} onClick={() => setTier(t)} aria-pressed={tier === t}>{t}</button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhum Mega cadastrado ainda.</p>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhum Mega encontrado para essa busca.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ key, list }) => (
            <section key={key}>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: tierColors[key as keyof typeof tierColors] }} aria-hidden />
                {key === "undefined" ? "Sem tier" : key} <span className="text-sm font-normal tabular-nums text-muted">{list.length}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {list.map((entry) => {
                  const hunt = sealedHuntOf(entry.pokemon);
                  return (
                    <div key={entry.pokemon.id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-raised">
                      <PokemonImage key={entry.image?.src} src={entry.image?.src ?? null} alt={megaName(entry.pokemon)} />
                      <div className="space-y-2 p-2.5">
                        <p className="text-sm font-semibold leading-snug">{megaName(entry.pokemon)}</p>
                        <div className="flex flex-wrap gap-1">{entry.originalTypes?.map((t) => <TypeBadge key={t} type={t} />)}</div>
                        <p className="border-t border-line pt-2 text-[11px] text-muted">{hunt ? <>Cai de: <span className="font-medium text-fg">{hunt}</span></> : "Drop das caças Sealed"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
