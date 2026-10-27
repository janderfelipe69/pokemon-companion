"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUp, ChevronDown, RefreshCw, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TEAM_PRESETS, type TeamPreset } from "@/config/teamPresets";
import { normalize } from "@/lib/pokemonFilters";
import { buildTeams, listCandidates, monoOptions, TEAM_SIZE } from "@/lib/teamBuilder";
import { sealedHuntOf } from "@/lib/sealed";
import { huntTargets } from "@/lib/typeFinder";
import type { PokedexEntry } from "@/types/pokedex";
import { TIERS, type PokemonType, type Tier } from "@/types/pokemon";
import { TargetPicker } from "./TargetPicker";
import { TypeRestriction, type TypeMode } from "./TypeRestriction";
import { MemberTile, TeamCard } from "./TeamCard";
import { WeaknessPanel } from "./WeaknessPanel";

const STEP = "mb-4 flex items-center gap-3 text-lg font-semibold";
const stepNumber = "grid size-7 place-items-center rounded-full bg-gold/15 text-sm text-gold";

export function TeamBuilder({ entries, pools = {}, jumpTo = null, targetList, variant = "cacas" }: { entries: PokedexEntry[]; /** Lista de Pokémon úteis por tipo de time (IDs). */ pools?: Record<string, string[]>; /** Escolhe um alvo vindo de fora (a aba "Tenho um tipo"). `nonce` muda a cada pedido, mesmo para o mesmo alvo. */ jumpTo?: { id: string; nonce: number } | null ; /** Lista própria de alvos (aba Sealed). Sem ela, usa os alvos de caça normais. */ targetList?: PokedexEntry[]; variant?: "cacas" | "sealed" }) {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "">("");
  const [presetId, setPresetId] = useState<TeamPreset["id"]>("economico");
  const [includeFallback, setIncludeFallback] = useState(true);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [typeMode, setTypeMode] = useState<TypeMode>("mixed");
  const [onlyTypes, setOnlyTypes] = useState<PokemonType[]>([]);
  const [round, setRound] = useState(0);
  const [showAll, setShowAll] = useState(false);

  // Depois de escolher o alvo, a página desce sozinha até as fraquezas (e dá para voltar à lista com um clique).
  const pickerRef = useRef<HTMLDivElement>(null);
  const weaknessRef = useRef<HTMLDivElement>(null);
  const [scrollTick, setScrollTick] = useState(0);
  const scrollTo = (element: HTMLElement | null) =>
    element?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  useEffect(() => {
    if (scrollTick > 0) scrollTo(weaknessRef.current); // o bloco só existe depois que o alvo foi escolhido e a tela atualizou
  }, [scrollTick]);

  // Só Mythic, Legendary e Ultra Rare entram em rotação como alvo. Os tiers abaixo ficam de fora.
  const targets = useMemo(() => targetList ?? huntTargets(entries), [targetList, entries]);
  const sealed = variant === "sealed";
  const tierChips = useMemo(() => (sealed ? TIERS.filter((t) => targets.some((e) => e.pokemon.tier === t)) : undefined), [sealed, targets]);

  const visibleTargets = useMemo(() => {
    const q = normalize(query);
    return targets.filter((e) => (!tierFilter || e.pokemon.tier === tierFilter) && (!q || normalize(e.pokemon.sourceName ?? e.pokemon.name).includes(q)));
  }, [targets, query, tierFilter]);

  const target = targets.find((e) => e.pokemon.id === targetId) ?? null;
  const preset = TEAM_PRESETS.find((p) => p.id === presetId) ?? TEAM_PRESETS[0];

  // Lista de Pokémon úteis (editada no admin): só vale para tipos de time "curated" e se tiver ao menos 1 Pokémon.
  const poolIds = pools[preset.id];
  const pool = useMemo(() => (preset.curated && poolIds && poolIds.length > 0 ? new Set(poolIds) : undefined), [preset.curated, poolIds]);

  // Quem bate o alvo neste tipo de time, já contando o próprio alvo (ele pode caçar ele mesmo, se acertar a própria fraqueza).
  const withSelf = useMemo(() => (target ? listCandidates(entries, target, preset, includeFallback, pool, true) : null), [entries, target, preset, includeFallback, pool]);
  const selfAvailable = !!withSelf?.candidates.some((c) => c.isTarget);

  // Tipos de ataque que batem o alvo e quantos Pokémon existem de cada um neste tipo de time.
  const typeOptions = useMemo(() => {
    if (!withSelf) return [];
    return monoOptions(includeSelf ? withSelf.candidates : withSelf.candidates.filter((c) => !c.isTarget), withSelf.profile);
  }, [withSelf, includeSelf]);

  const build = useMemo(
    () => (target ? buildTeams(entries, target, preset, { count: 3, round, includeFallback, onlyTypes, pool, includeTarget: includeSelf }) : null),
    [entries, target, preset, round, includeFallback, onlyTypes, pool, includeSelf],
  );

  const pickTarget = (id: string) => {
    setTargetId(id);
    setTypeMode("mixed"); // os tipos que batem mudam de alvo para alvo
    setOnlyTypes([]);
    setRound(0);
    setShowAll(false);
    setScrollTick((t) => t + 1);
  };
  const changeTypes = (types: PokemonType[]) => {
    setOnlyTypes(types);
    setRound(0);
  };
  const changeMode = (mode: TypeMode) => {
    setTypeMode(mode);
    setRound(0);
    if (mode === "mixed") setOnlyTypes([]);
    // Tipo único começa já com o tipo que tem mais Pokémon efetivos; o usuário troca com um clique.
    else if (mode === "single") setOnlyTypes((cur) => (cur.length > 0 ? [cur[0]] : typeOptions.filter((o) => o.count > 0).slice(0, 1).map((o) => o.type)));
  };
  const pickPreset = (id: TeamPreset["id"]) => {
    setPresetId(id);
    setRound(0);
    setShowAll(false);
  };

  // Pedido vindo da aba "Tenho um tipo": escolhe o alvo e a página desce até as fraquezas dele.
  useEffect(() => {
    if (jumpTo && targets.some((e) => e.pokemon.id === jumpTo.id)) {
      setQuery("");
      setTierFilter("");
      pickTarget(jumpTo.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a um novo pedido (nonce)
  }, [jumpTo?.nonce]);

  const best = build?.teams[0];
  const incomplete = !!build && (!best || best.missing > 0);

  return (
    <div className="space-y-6">
      <div ref={pickerRef} className="scroll-mt-4">
        <Card>
          <h2 className={STEP}>
            <span className={stepNumber}>1</span> {sealed ? "Qual Mega você quer caçar?" : "O que você quer caçar?"}
          </h2>
          <TargetPicker targets={visibleTargets} selectedId={targetId} query={query} tier={tierFilter} onQuery={setQuery} onTier={setTierFilter} onSelect={pickTarget} tiers={tierChips} placeholder={sealed ? "Buscar Mega para caçar" : undefined} noteOf={sealed ? (e) => { const hunt = sealedHuntOf(e.pokemon); return hunt ? `Cai de: ${hunt}` : null; } : undefined} />
        </Card>
      </div>

      {target && build && (
        <>
          <div ref={weaknessRef} className="scroll-mt-4">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-3 text-lg font-semibold">
                  <span className={stepNumber}>2</span> Fraquezas do alvo
                </h2>
                <button type="button" onClick={() => scrollTo(pickerRef.current)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-gold">
                  <ArrowUp className="size-4" aria-hidden /> Trocar alvo
                </button>
              </div>
              <WeaknessPanel target={target} profile={build.profile} />
            </Card>
          </div>

          <Card>
            <h2 className={STEP}>
              <span className={stepNumber}>3</span> Que tipo de time você quer?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Tipo de time">
              {TEAM_PRESETS.map((p) => {
                const active = p.id === presetId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickPreset(p.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-gold bg-gold/5 ring-1 ring-gold" : "border-line bg-raised hover:border-gold/50"}`}
                  >
                    <p className="font-semibold">{p.label}</p>
                    <p className="mt-0.5 text-sm text-gold">{p.tagline}</p>
                    <p className="mt-2 text-sm text-muted">{p.description}</p>
                  </button>
                );
              })}
            </div>
            {pool && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-muted">
                <Star className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  Neste tipo de time, os Pokémon são sorteados só entre os <strong className="font-medium text-fg">{pool.size} da lista de úteis</strong>
                  {build ? <>; <strong className="font-medium text-fg">{build.candidates.length}</strong> deles batem a efetividade deste alvo</> : null}. O limite de T1 do tipo de time não vale com a lista.{" "}
                  <Link href="/admin#times" className="text-gold underline underline-offset-2 hover:opacity-80">Editar a lista</Link>
                </span>
              </p>
            )}
            <div className="mt-5 border-t border-line pt-5">
              <TypeRestriction options={typeOptions} mode={typeMode} selected={onlyTypes} onMode={changeMode} onChange={changeTypes} />
            </div>
            {selfAvailable && target && (
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-muted">
                <input type="checkbox" checked={includeSelf} onChange={(e) => { setIncludeSelf(e.target.checked); setRound(0); }} className="mt-1 accent-[var(--color-gold)]" />
                <span>
                  Incluir o próprio alvo (<strong className="font-medium text-fg">{target.pokemon.sourceName ?? target.pokemon.name}</strong>) como opção: ele também bate a efetividade, então um que você já tenha pode caçar o que está solto. Aparece marcado no time.
                </span>
              </label>
            )}
            {preset.fallback && (
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-muted">
                <input type="checkbox" checked={includeFallback} onChange={(e) => { setIncludeFallback(e.target.checked); setRound(0); }} className="mt-1 accent-[var(--color-gold)]" />
                <span>
                  Completar com tiers abaixo ({preset.fallback.map((f) => f.tier).join(", ")}) quando não houver {TEAM_SIZE} Pokémon efetivos neste tipo de time. Eles aparecem marcados como reforço.
                </span>
              </label>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-3 text-lg font-semibold">
                <span className={stepNumber}>4</span> Times sugeridos
              </h2>
              {build.teams.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRound((r) => r + 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
                >
                  <RefreshCw className="size-4" aria-hidden /> Gerar outras opções
                </button>
              )}
            </div>

            {incomplete && (
              <p className="mb-4 flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-muted" role="status">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                {best
                  ? `Só existem ${best.members.length} Pokémon ${pool ? "na lista de úteis" : "cadastrados"} que batem a efetividade neste tipo de time. Faltam ${best.missing} para completar os ${TEAM_SIZE}.`
                  : "Nenhum Pokémon cadastrado bate a efetividade contra este alvo neste tipo de time."}
                {preset.fallback && !includeFallback && " Ative o reforço com tiers abaixo para completar."}
                {onlyTypes.length > 0 && " Liberar mais tipos (ou voltar para Misto) também ajuda a completar o time."}
              </p>
            )}

            {build.teams.length > 0 ? (
              <div className="space-y-4">
                {build.teams.map((team, i) => <TeamCard key={team.members.map((m) => m.entry.pokemon.id).join("|")} team={team} index={i} />)}
              </div>
            ) : (
              <p className="text-sm text-muted">Não há Pokémon para montar um time com essas escolhas.</p>
            )}

            {build.candidates.length > 0 && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  aria-expanded={showAll}
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-gold"
                >
                  <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
                  Ver todos os {build.candidates.length} Pokémon que batem a efetividade
                </button>
                {showAll && (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                    {build.candidates.map((c) => <MemberTile key={c.entry.pokemon.id} member={c} />)}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {!target && <p className="text-center text-sm text-muted">Escolha um Pokémon acima para ver as fraquezas e montar o time.</p>}
    </div>
  );
}
