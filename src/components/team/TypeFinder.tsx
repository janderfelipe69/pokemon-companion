"use client";

import { useMemo, useState } from "react";
import { EyeOff, Search, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { typeInfo } from "@/config/pokemonTypes";
import { tierColors } from "@/config/tiers";
import { HUNT_TIERS } from "@/config/teamPresets";
import { normalize } from "@/lib/pokemonFilters";
import { reachFor, tallyTypes, type Reach } from "@/lib/typeFinder";
import type { PokedexEntry } from "@/types/pokedex";
import type { PokemonType, Tier } from "@/types/pokemon";
import { EffectBadge } from "./EffectBadge";

const STEP = "mb-4 flex items-center gap-3 text-lg font-semibold";
const stepNumber = "grid size-7 place-items-center rounded-full bg-gold/15 text-sm text-gold";
const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${active ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`;

type Props = {
  /** Os alvos de caça (mesma lista do montador). */
  targets: PokedexEntry[];
  selected: PokemonType[];
  onChange: (types: PokemonType[]) => void;
  /** Clicar em um Pokémon leva ao montador de times com ele já escolhido. */
  onPick: (id: string) => void;
};

function ReachCard({ item, onPick }: { item: Reach; onPick: (id: string) => void }) {
  const { entry, hits, full } = item;
  const { pokemon: p } = entry;
  return (
    <button type="button" onClick={() => onPick(p.id)} className="flex flex-col overflow-hidden rounded-xl border border-line bg-raised text-left transition-colors hover:border-gold/50" title="Montar time para caçar este Pokémon">
      <PokemonImage key={entry.image?.src} src={entry.image?.src ?? null} alt={p.sourceName ?? p.name} />
      <div className="space-y-2 p-2.5">
        <p className="text-sm font-semibold leading-snug">{p.sourceName ?? p.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ backgroundColor: tierColors[p.tier ?? "undefined"] }} />
          {p.tier}
        </p>
        <div className="flex flex-wrap gap-1">{entry.originalTypes?.map((t) => <TypeBadge key={t} type={t} />)}</div>
        <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
          <span className="mr-0.5 text-[11px] text-muted">Bate com</span>
          {hits.map((h) => (
            <span key={h.type} className="inline-flex items-center gap-1" title={`${typeInfo[h.type].label}: ${h.level === "x2" ? "2x" : "1.5x"}`}>
              <TypeIcon type={h.type} className="size-5" />
              <EffectBadge level={h.level} full={full && h === hits[0]} />
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function Group({ title, hint, items, onPick }: { title: string; hint: string; items: Reach[]; onPick: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h3 className="flex items-baseline gap-2 text-base font-semibold">
        {title} <span className="text-sm font-normal tabular-nums text-muted">{items.length}</span>
      </h3>
      <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {items.map((item) => <ReachCard key={item.entry.pokemon.id} item={item} onPick={onPick} />)}
      </div>
    </section>
  );
}

/** "Tenho um tipo": escolha 1 ou mais tipos de ataque e veja quais Pokémon eles conseguem caçar, e quais ficam de fora. */
export function TypeFinder({ targets, selected, onChange, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<Tier | "">("");

  const tally = useMemo(() => tallyTypes(targets), [targets]);
  const { reached, missed } = useMemo(() => reachFor(targets, selected), [targets, selected]);

  const q = normalize(query);
  const matches = (e: PokedexEntry) => (!tier || e.pokemon.tier === tier) && (!q || normalize(e.pokemon.sourceName ?? e.pokemon.name).includes(q));
  const shown = reached.filter((r) => matches(r.entry));
  const full = shown.filter((r) => r.full);
  const partial = shown.filter((r) => !r.full);
  const shownMissed = missed.filter(matches);

  const toggle = (type: PokemonType) => onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);
  const fullCount = reached.filter((r) => r.full).length;

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 text-lg font-semibold">
            <span className={stepNumber}>1</span> Que tipo de ataque você tem?
          </h2>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
              <X className="size-4" aria-hidden /> Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de ataque">
          {tally.map((t) => {
            const active = selected.includes(t.type);
            const { label, color } = typeInfo[t.type];
            return (
              <button
                key={t.type}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(t.type)}
                title={`${label} bate ${t.full} Pokémon com efetividade máxima${t.total > t.full ? ` e mais ${t.total - t.full} só com 1.5x` : ""}`}
                className="inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors"
                style={active ? { color, borderColor: color, backgroundColor: `${color}26` } : { borderColor: `${color}55`, color: "var(--color-fg)" }}
              >
                <TypeIcon type={t.type} className="size-6" />
                {label}
                <span className="text-xs tabular-nums text-muted">{t.full}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">O número é quantos Pokémon de caça (Mythic, Legendary e Ultra Rare) o tipo bate com efetividade máxima. Marque mais de um tipo para ver o que o conjunto cobre.</p>
      </Card>

      {selected.length === 0 ? (
        <p className="text-center text-sm text-muted">Escolha um tipo acima para ver os Pokémon que ele consegue farmar.</p>
      ) : (
        <Card>
          <h2 className={STEP}>
            <span className={stepNumber}>2</span> O que {selected.length === 1 ? "esse tipo" : "esses tipos"} consegue farmar
          </h2>
          <p className="mb-4 text-sm text-muted">
            <strong className="font-medium text-fg">{fullCount}</strong> de {targets.length} Pokémon com efetividade máxima
            {reached.length > fullCount && <>, mais <strong className="font-medium text-fg">{reached.length - fullCount}</strong> só com 1.5x</>}
            {missed.length > 0 && <> · <strong className="font-medium text-fg">{missed.length}</strong> não {missed.length === 1 ? "é batido" : "são batidos"}</>}.
            {" "}Clique em um Pokémon para montar o time dele.
          </p>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nesta lista" aria-label="Buscar nesta lista" className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted" />
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tier">
              <button type="button" className={chip(tier === "")} onClick={() => setTier("")} aria-pressed={tier === ""}>Todos</button>
              {HUNT_TIERS.map((t) => (
                <button key={t} type="button" className={chip(tier === t)} onClick={() => setTier(t)} aria-pressed={tier === t}>{t}</button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <Group title="Efetividade máxima" hint="2x, ou 1.5x quando é o máximo possível contra o alvo. É o que o montador considera ideal." items={full} onPick={onPick} />
            <Group title="Só 1.5x" hint="Bate, mas existe um tipo que faria mais dano nesse alvo." items={partial} onPick={onPick} />
            {full.length === 0 && partial.length === 0 && <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhum Pokémon bate com essa busca e esse tier.</p>}
          </div>

          {shownMissed.length > 0 && (
            <details className="group mt-8 rounded-xl border border-line bg-raised/50 p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                <EyeOff className="size-4 text-muted" aria-hidden />
                Quem sobra: {shownMissed.length} Pokémon que {selected.length === 1 ? "esse tipo não bate" : "esses tipos não batem"}
                <span className="ml-auto text-xs text-muted group-open:hidden">mostrar</span>
              </summary>
              <p className="mb-3 mt-2 text-xs text-muted">Para cobrir esses, some outro tipo ao conjunto. Clique em um deles para ver quais tipos batem.</p>
              <ul className="flex flex-wrap gap-2">
                {shownMissed.map((e) => (
                  <li key={e.pokemon.id}>
                    <button type="button" onClick={() => onPick(e.pokemon.id)} className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-left text-sm transition-colors hover:border-gold/50">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tierColors[e.pokemon.tier ?? "undefined"] }} aria-hidden />
                      {e.pokemon.sourceName ?? e.pokemon.name}
                      <span className="flex gap-0.5">{e.originalTypes?.map((t) => <TypeIcon key={t} type={t} className="size-4" />)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
