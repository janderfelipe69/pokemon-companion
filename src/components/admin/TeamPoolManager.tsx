"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Check, RotateCcw, Search } from "lucide-react";
import { PokemonThumb } from "@/components/drops/DropLists";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { normalizeText } from "@/lib/talents/items";
import type { PokemonType } from "@/types/pokemon";

type PoolPokemon = { id: string; name: string; tier: string; image: string | null; dexNumber: number | null; offensiveTypes: PokemonType[] };
type PoolData = { preset: { id: string; label: string; tagline: string; tiers: string[] }; pokemon: PoolPokemon[] };
type Notice = { kind: "ok" | "error"; text: string };
type StatusFilter = "all" | "in" | "out";

const PRESET_ID = "economico";
const PAGE = 60;

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) => a.size === b.size && [...a].every((x) => b.has(x));

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Marca quais Pokémon "valem a pena" no time Fraco, eficiente e barato. O montador sorteia só entre eles. */
export function TeamPoolManager() {
  const [data, setData] = useState<PoolData | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [limit, setLimit] = useState(PAGE);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(`/api/admin/team-pool?preset=${PRESET_ID}`, { cache: "no-store" });
      const body = await readJson(response);
      if (!response.ok) throw new Error(String(body.error || "Não foi possível carregar a lista."));
      const ids = new Set(body.poolIds as string[]);
      setData({ preset: body.preset as PoolData["preset"], pokemon: body.pokemon as PoolPokemon[] });
      setSaved(ids);
      setDraft(new Set(ids));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar a lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pokemon = useMemo(() => data?.pokemon ?? [], [data]);
  const inCount = useMemo(() => pokemon.filter((p) => draft.has(p.id)).length, [pokemon, draft]);
  const dirty = !sameSet(draft, saved);

  const visible = useMemo(() => {
    const q = normalizeText(query);
    return pokemon.filter((p) => {
      if (q && !normalizeText(p.name).includes(q)) return false;
      if (tier !== "all" && p.tier !== tier) return false;
      return status === "all" || (status === "in" ? draft.has(p.id) : !draft.has(p.id));
    });
  }, [pokemon, query, tier, status, draft]);

  const change = (fn: (next: Set<string>) => void) => {
    setNotice(null);
    setDraft((current) => {
      const next = new Set(current);
      fn(next);
      return next;
    });
  };
  const toggle = (id: string) => change((s) => (s.has(id) ? s.delete(id) : s.add(id)));

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/team-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: PRESET_ID, pokemonIds: [...draft] }),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(String(body.error || "Não foi possível salvar."));
      setSaved(new Set(draft));
      setNotice({ kind: "ok", text: inCount === 0 ? "Lista salva vazia: o montador volta a usar todos os T2 e T1." : `Lista salva com ${inCount} ${inCount === 1 ? "Pokémon" : "Pokémon"}.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao salvar a lista." });
    } finally {
      setSaving(false);
    }
  }

  const chip = (active: boolean, label: string, count: number, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        onClick();
        setLimit(PAGE);
      }}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${active ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"}`}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="team-pool-title">
      <h2 id="team-pool-title" className="text-xl font-semibold">Pokémon úteis do time barato</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Marque os Pokémon que valem a pena no tipo de time <strong className="font-medium text-fg">“{data?.preset.label ?? "Fraco, eficiente e barato"}”</strong>. O Montador de times
        sorteia só entre eles (o sorteio de “gerar outras opções” também). <strong className="font-medium text-fg">Lista vazia = ele usa todos os {data?.preset.tiers.join(" e ") ?? "T2 e T1"}</strong>, como antes.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando Pokémon...</p>
      ) : loadError || !data ? (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p>{loadError || "Não foi possível carregar a lista."}</p>
            <button type="button" onClick={() => void load()} className="mt-2 underline">Tentar de novo</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1 sm:max-w-sm">
              <span className="mb-1.5 block text-sm text-muted">Buscar Pokémon pelo nome</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setLimit(PAGE);
                  }}
                  placeholder="Ex.: Pidgey"
                  className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted/60"
                />
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {chip(status === "all", "Todos", pokemon.length, () => setStatus("all"))}
              {chip(status === "in", "Na lista", inCount, () => setStatus("in"))}
              {chip(status === "out", "Fora da lista", pokemon.length - inCount, () => setStatus("out"))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chip(tier === "all", "Todos os tiers", pokemon.length, () => setTier("all"))}
            {data.preset.tiers.map((t) =>
              chip(tier === t, t, pokemon.filter((p) => p.tier === t).length, () => setTier(t)),
            )}
            <span className="flex-1" />
            <button type="button" onClick={() => change((s) => visible.forEach((p) => s.add(p.id)))} disabled={visible.length === 0} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40">
              Marcar os {visible.length} visíveis
            </button>
            <button type="button" onClick={() => change((s) => visible.forEach((p) => s.delete(p.id)))} disabled={visible.length === 0} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40">
              Desmarcar os visíveis
            </button>
          </div>

          <p className="mt-3 text-sm text-muted" aria-live="polite">
            <strong className="font-semibold text-fg">{inCount}</strong> {inCount === 1 ? "Pokémon na lista" : "Pokémon na lista"} de {pokemon.length} · mostrando {Math.min(limit, visible.length)} de {visible.length}
          </p>
          {inCount === 0 && <p className="mt-1 text-xs text-muted">Nenhum marcado: o montador está usando todos os Pokémon deste tipo de time.</p>}
          {inCount > 0 && inCount < 6 && <p className="mt-1 text-xs text-amber-300">Com menos de 6 Pokémon na lista, os times saem incompletos.</p>}

          {visible.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {visible.slice(0, limit).map((p) => {
                const on = draft.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      aria-pressed={on}
                      className={`relative flex h-full w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors ${
                        on ? "border-gold bg-gold/10 ring-1 ring-gold/50" : "border-line bg-black/25 hover:border-gold/40 hover:bg-white/5"
                      }`}
                    >
                      {on && (
                        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-gold text-ink" aria-hidden>
                          <Check className="size-3.5" />
                        </span>
                      )}
                      <PokemonThumb pokemon={{ id: p.id, name: p.name, image: p.image, dexNumber: p.dexNumber }} className="size-16" />
                      <span className="w-full break-words text-sm font-semibold leading-tight">{p.name}</span>
                      <span className="text-[11px] text-muted">{p.tier}</span>
                      <span className="flex flex-wrap justify-center gap-1">
                        {p.offensiveTypes.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">{pokemon.length === 0 ? "Nenhum Pokémon com tipo ofensivo cadastrado nesses tiers." : "Nenhum Pokémon encontrado."}</p>
          )}
          {visible.length > limit && (
            <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mt-4 rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-fg">
              Mostrar mais {Math.min(PAGE, visible.length - limit)}
            </button>
          )}

          <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-raised/95 p-3 shadow-lg shadow-black/40 backdrop-blur">
            <p role="status" className="min-w-0 flex-1 text-sm">
              {notice ? (
                <span className={`flex items-center gap-2 ${notice.kind === "ok" ? "text-teal" : "text-red-300"}`}>
                  {notice.kind === "ok" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertCircle className="size-4 shrink-0" aria-hidden />}
                  {notice.text}
                </span>
              ) : dirty ? (
                <span className="text-muted">Alterações não salvas na lista.</span>
              ) : (
                <span className="text-muted">Nenhuma alteração.</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(new Set(saved));
                setNotice(null);
              }}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden /> Descartar
            </button>
            <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
              {saving ? "Salvando..." : "Salvar lista"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
