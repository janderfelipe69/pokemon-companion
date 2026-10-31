"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Coins, Gem, Layers, Search, Star, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { STAR_POKEMON, STAR_TIERS, type StarEntry } from "@/data/starCosts";
import { normalize } from "@/lib/pokemonFilters";
import { bigArt, smallArt, starCost } from "@/lib/starCost";

const MAX_RESULTS = 12;
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Cor da etiqueta do tier do jogo (o índice vem de `STAR_TIERS`; -1 = sem custo cadastrado). */
const TAG: Record<number, string> = {
  0: "bg-[#8bd17c] text-black",
  1: "bg-[#6ec1ff] text-black",
  2: "bg-[#f5a623] text-black",
  3: "bg-[#c78bff] text-black",
  4: "bg-[#ff8bd0] text-black",
  5: "bg-[#e0143c] text-white",
};
const TAG_NONE = "bg-line text-fg";

const stepNumber = "grid size-7 place-items-center rounded-full bg-gold/15 text-sm text-gold";
const stepTitle = "mb-4 flex items-center gap-3 text-lg font-semibold";

function Tag({ entry }: { entry: StarEntry }) {
  return <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${TAG[entry[1]] ?? TAG_NONE}`}>{entry[2]}</span>;
}

/** Sprite pequeno; some sem barulho se a imagem não existir. */
function Sprite({ art, className = "size-10" }: { art: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fonte externa configurável; evita o otimizador de imagens
    <img
      src={smallArt(art)}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
      className={`${className} shrink-0 rounded-lg bg-raised object-contain [image-rendering:pixelated]`}
    />
  );
}

/** Calculadora de custo de star: do Pokémon e das stars que já tem até a star que quer, contando os pokes que já possui. */
export function StarCalculator() {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [pk, setPk] = useState<StarEntry | null>(null);
  const [tierPick, setTierPick] = useState<number | null>(null); // tier escolhido à mão; sobrepõe o do Pokémon
  const [cur, setCur] = useState(0);
  const [goal, setGoal] = useState(1);
  const [spare, setSpare] = useState([0, 0, 0, 0, 0, 0]);

  const q = normalize(query);
  const { options, more } = useMemo(() => {
    if (!q) return { options: [] as StarEntry[], more: 0 };
    const hits = STAR_POKEMON.filter((e) => normalize(e[0]).includes(q));
    // Quem começa com o que foi digitado vem primeiro.
    hits.sort((a, b) => Number(!normalize(a[0]).startsWith(q)) - Number(!normalize(b[0]).startsWith(q)));
    return { options: hits.slice(0, MAX_RESULTS), more: Math.max(0, hits.length - MAX_RESULTS) };
  }, [q]);
  const open = focused && options.length > 0;

  // O tier do cálculo: o que a pessoa escolheu, ou o do Pokémon (quando ele já tem custo cadastrado).
  const tierIndex = tierPick ?? (pk && pk[1] >= 0 ? pk[1] : null);
  const tier = tierIndex !== null ? STAR_TIERS[tierIndex] : null;

  function choose(entry: StarEntry) {
    setPk(entry);
    setTierPick(null);
    setQuery("");
    setActive(0);
    inputRef.current?.blur();
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!options.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % options.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + options.length) % options.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(options[active] ?? options[0]); }
    else if (e.key === "Escape") { setQuery(""); }
  }

  function setStar(k: number) {
    const next = cur === k ? k - 1 : k; // clicar na star atual tira uma
    setCur(next);
    if (goal <= next) setGoal(Math.min(5, next + 1));
  }

  const result = useMemo(() => (tier && goal > cur ? starCost(tier.factor, cur, goal, spare) : null), [tier, cur, goal, spare]);
  const missingTier = !tier;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Passos */}
        <div className="space-y-6">
          <Card className={pk || tier ? "" : "border-gold/40"}>
            <h2 className={stepTitle}><span className={stepNumber}>1</span> Qual Pokémon?</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={onKey}
                placeholder="Buscar Pokémon (ex.: Charizard, Shiny Gengar)"
                autoComplete="off"
                className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
              />
              {open && (
                <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-line bg-panel shadow-xl shadow-black/40">
                  {options.map((o, i) => (
                    <li
                      key={o[3]}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === active}
                      onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                      onMouseEnter={() => setActive(i)}
                      className={`flex cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${i === active ? "bg-raised" : ""}`}
                    >
                      <Sprite art={o[3]} />
                      <span className="min-w-0 flex-1 truncate font-medium">{o[0]}</span>
                      <Tag entry={o} />
                    </li>
                  ))}
                  {more > 0 && <li className="px-3 py-2 text-xs text-muted" role="presentation">Mais {more} resultados: continue digitando para refinar.</li>}
                </ul>
              )}
            </div>

            {pk && (
              <div className="mt-4 flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/5 p-3">
                <div className="size-24 shrink-0 overflow-hidden rounded-xl bg-raised"><PokemonImage key={pk[3]} src={bigArt(pk[3])} alt={pk[0]} /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{pk[0]}</p>
                  <p className="mt-1"><Tag entry={pk} /></p>
                  {pk[1] < 0 && <p className="mt-2 text-xs text-muted">Esse tier ainda não tem custo de star cadastrado. Escolha um tier abaixo para calcular mesmo assim.</p>}
                </div>
                <button type="button" onClick={() => { setPk(null); setTierPick(null); }} aria-label="Limpar Pokémon" className="self-start rounded-lg p-1.5 text-muted hover:bg-raised hover:text-fg"><X className="size-5" aria-hidden /></button>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-xs text-muted">
                {pk && pk[1] >= 0 && tierPick === null ? "Tier do cálculo (vem do Pokémon). Dá para trocar:" : tierPick !== null ? "Tier escolhido por você:" : "Ou escolha o tier direto, sem escolher o Pokémon:"}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tier do cálculo">
                {STAR_TIERS.map((t, i) => (
                  <button
                    key={t.label}
                    type="button"
                    aria-pressed={tierIndex === i}
                    onClick={() => setTierPick(pk && pk[1] === i ? null : i)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${tierIndex === i ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className={stepTitle}><span className={stepNumber}>2</span> Stars atuais</h2>
            <div className="flex items-center justify-center gap-2" role="group" aria-label="Stars atuais">
              {[1, 2, 3, 4, 5].map((k) => (
                <button key={k} type="button" aria-pressed={k <= cur} aria-label={`${k} ${k === 1 ? "star" : "stars"}`} onClick={() => setStar(k)} className="rounded-lg p-1 transition-transform hover:scale-110">
                  <Star className={`size-9 ${k <= cur ? "fill-gold text-gold" : "text-line"}`} aria-hidden />
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-lg font-semibold tabular-nums">{cur} <span className="text-muted">/ 5</span></p>
          </Card>

          <Card>
            <h2 className={stepTitle}><span className={stepNumber}>3</span> Até quantas stars?</h2>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((g) => {
                const on = g === goal;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={g <= cur}
                    aria-pressed={on}
                    onClick={() => setGoal(g)}
                    className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${on ? "border-teal bg-teal/10 shadow-[0_0_14px_-2px_rgba(67,208,180,0.4)]" : "border-line bg-raised hover:border-teal/50"}`}
                  >
                    <span className="grid h-10 place-items-center">{pk && <Sprite art={pk[3]} />}</span>
                    <span className="whitespace-nowrap text-[11px] tracking-wider text-gold">{"★".repeat(g)}</span>
                    <span className={`font-bold ${on ? "text-teal" : ""}`}>{g}★</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted">Clique na star que você quer alcançar. As que você já tem ficam bloqueadas.</p>
          </Card>

          {goal > 1 && (
            <Card className="border-gold/25">
              <h2 className={stepTitle}><span className={stepNumber}>4</span> Pokes que eu já tenho</h2>
              <p className="mb-3 text-sm text-muted">Quantos pokes <b className="font-medium text-fg">sobrando</b> de cada star você já possui. Eles entram nas fusões e reduzem o custo.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[1, 2, 3, 4].filter((k) => k < goal).map((k) => (
                  <label key={k} className="block">
                    <span className="mb-1 block text-xs text-muted">{k} star</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={spare[k] || ""}
                      placeholder="0"
                      onChange={(e) => setSpare((s) => s.map((v, i) => (i === k ? Math.max(0, parseInt(e.target.value, 10) || 0) : v)))}
                      className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-center text-sm text-fg placeholder:text-muted/60"
                    />
                  </label>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Resultado */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="border-gold/30">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">Resumo do custo ({cur}★ → {goal}★)</h2>
            <div className="space-y-2">
              {([
                [Gem, "DD", result ? fmt(4 * result.kk) : "—", "text-sky-300"],
                [Coins, "KK", result ? fmt(result.kk) : "—", "text-gold"],
                [Layers, "Pokes normais (total)", result ? fmt(result.normals) : "—", "text-fg"],
              ] as const).map(([Icon, label, value, color]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-raised px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-muted"><Icon className="size-4" aria-hidden /> {label}</span>
                  <b className={`text-2xl tabular-nums ${color}`}>{value}</b>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted" role="status">
              {missingTier
                ? pk ? `${pk[0]} é ${pk[2]}: sem custo cadastrado. Escolha um tier no passo 1.` : "Escolha o Pokémon (ou o tier) para ver o custo."
                : goal <= cur
                  ? "Escolha um objetivo maior que a star atual."
                  : `+${tier.damage * (goal - cur)}% de dano · ${tier.damage}% por star · ${tier.label}`}
            </p>
          </Card>
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <h2 className="mb-1 text-lg font-semibold">Tabela de custos por tier</h2>
        <p className="mb-4 text-sm text-muted">Valores em DD por upgrade, sem contar fabricar o poke consumido. O resumo soma tudo.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Tier</th>
                {[1, 2, 3, 4, 5].map((n) => <th key={n} className="px-3 py-2 font-medium">{n - 1}★ → {n}★</th>)}
                <th className="px-3 py-2 font-medium">Dano por star</th>
              </tr>
            </thead>
            <tbody>
              {STAR_TIERS.map((t, i) => (
                <tr key={t.label} className={`border-t border-line ${tierIndex === i ? "bg-gold/10" : ""}`}>
                  <td className="px-3 py-2.5 font-semibold">{t.label}</td>
                  {[1, 2, 3, 4, 5].map((n) => <td key={n} className="px-3 py-2.5 tabular-nums text-sky-300">{fmt(4 * t.factor * n)}</td>)}
                  <td className="px-3 py-2.5 tabular-nums text-teal">+{t.damage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
