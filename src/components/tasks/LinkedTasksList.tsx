"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageOff, Lock, Search, Target } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { HUNT_TYPES, type HuntType } from "@/data/linkedTasks";
import { normalize } from "@/lib/pokemonFilters";
import type { TaskView } from "@/lib/linkedTasks";

const STORAGE_KEY = "linked-tasks-current";
const HUNT_TONE: Record<HuntType, "muted" | "teal" | "gold"> = { Normal: "muted", Wild: "teal", Hoenn: "gold" };
const fmt = (n: number) => n.toLocaleString("pt-BR");
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`;
const smallButton = "rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-gold/50 hover:text-fg";

/** Imagem pequena do Pokémon: se a principal falhar, tenta a reserva; se também falhar, mostra um ícone. */
function Thumb({ src, fallback, alt }: { src: string | null; fallback: string | null; alt: string }) {
  const [current, setCurrent] = useState<string | null>(src);
  const [failed, setFailed] = useState(!src);
  return (
    <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-raised sm:size-16">
      {failed || !current ? (
        <ImageOff className="size-5 text-muted" aria-label="Sem imagem" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- fonte externa configurável; evita o otimizador de imagens
        <img
          src={current}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => (current !== fallback && fallback ? setCurrent(fallback) : setFailed(true))}
          className="size-full object-contain p-1"
        />
      )}
    </div>
  );
}

/**
 * A lista numerada das Linked Tasks. A pessoa marca em qual tarefa está: as anteriores ficam como feitas, a atual em destaque
 * e as seguintes aguardam. O progresso fica só neste navegador (não precisa de login e não vai para o servidor).
 */
export function LinkedTasksList({ tasks }: { tasks: TaskView[] }) {
  const total = tasks.length;
  const [current, setCurrent] = useState(1); // número da tarefa em andamento (total + 1 = tudo concluído)
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [hunt, setHunt] = useState<HuntType | "">("");
  const [jump, setJump] = useState("");
  const rowRefs = useRef(new Map<number, HTMLLIElement>());

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (Number.isInteger(saved) && saved >= 1 && saved <= total + 1) setCurrent(saved);
    } catch {
      /* sem acesso ao armazenamento do navegador: tudo bem, o progresso só não fica salvo */
    }
    setReady(true);
  }, [total]);

  function save(n: number) {
    setCurrent(n);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(n));
    } catch {
      /* ok */
    }
  }

  function goTo(n: number) {
    if (!Number.isInteger(n) || n < 1 || n > total) return;
    // Se o filtro esconde a tarefa, tira o filtro para ela aparecer.
    setQuery("");
    setHunt("");
    window.setTimeout(() => rowRefs.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  const counts = useMemo(() => Object.fromEntries(HUNT_TYPES.map((h) => [h, tasks.filter((t) => t.hunt === h).length])) as Record<HuntType, number>, [tasks]);
  const shown = useMemo(() => {
    const q = normalize(query);
    return tasks.filter((t) => (!hunt || t.hunt === hunt) && (!q || normalize(t.pokemon).includes(q)));
  }, [tasks, query, hunt]);

  const done = Math.min(current - 1, total);
  const percent = Math.round((done / total) * 100);
  const finished = current > total;

  return (
    <div className="space-y-6">
      {/* Progresso */}
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {!ready ? (
              <span className="text-muted">{total} tarefas</span>
            ) : finished ? (
              <span className="font-semibold text-teal">Todas as {total} tarefas concluídas!</span>
            ) : (
              <>
                Você está na tarefa <b className="text-gold">nº {current}</b> <span className="text-muted">de {total} · {done} concluída{done === 1 ? "" : "s"} ({percent}%)</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {ready && !finished && <button type="button" onClick={() => goTo(current)} className={smallButton}>Ir para a minha tarefa</button>}
            {ready && current > 1 && (
              <button type="button" onClick={() => { if (window.confirm("Zerar o seu progresso e voltar para a tarefa nº 1?")) save(1); }} className={smallButton}>Zerar progresso</button>
            )}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progresso das Linked Tasks">
          <div className="h-full rounded-full bg-gradient-to-r from-gold to-teal transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">O progresso fica salvo só neste navegador. Marque a tarefa em que você está e as anteriores aparecem como feitas.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <span className="relative block flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar Pokémon" aria-label="Buscar Pokémon" className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted" />
        </span>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo de hunt">
          <button type="button" className={chip(hunt === "")} aria-pressed={hunt === ""} onClick={() => setHunt("")}>Todas · {total}</button>
          {HUNT_TYPES.map((h) => <button key={h} type="button" className={chip(hunt === h)} aria-pressed={hunt === h} onClick={() => setHunt(h)}>{h} · {counts[h]}</button>)}
        </div>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); goTo(Number(jump)); }}>
          <label className="sr-only" htmlFor="ir-tarefa">Ir para a tarefa número</label>
          <input id="ir-tarefa" inputMode="numeric" value={jump} onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))} placeholder="Ir para nº" className="w-28 rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-muted" />
          <button type="submit" disabled={!jump} className={`${smallButton} py-2.5 disabled:opacity-40`}>Ir</button>
        </form>
      </div>

      {/* Cabeçalho das colunas (telas largas) */}
      <div className="hidden items-center gap-3 px-3 text-xs font-medium uppercase tracking-wide text-muted sm:flex">
        <span className="w-11 text-center">Nº</span>
        <span className="w-24 text-right">Mobs</span>
        <span className="flex-1 pl-[4.75rem]">Pokémon</span>
        <span className="w-20 text-center">Hunt</span>
        <span className="w-28" />
      </div>

      {shown.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhuma tarefa encontrada para essa busca.</p>
      ) : (
        <ol className="space-y-2">
          {shown.map((t) => {
            const isDone = ready && t.n < current;
            const isCurrent = ready && t.n === current;
            return (
              <li
                key={t.n}
                ref={(el) => { if (el) rowRefs.current.set(t.n, el); else rowRefs.current.delete(t.n); }}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex scroll-mt-24 items-center gap-2 rounded-xl border px-3 py-2 transition-colors sm:gap-3 ${isCurrent ? "border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(242,184,75,0.35)]" : isDone ? "border-line bg-panel/60 opacity-60" : "border-line bg-panel"}`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold tabular-nums sm:w-11 ${isCurrent ? "bg-gold text-ink" : isDone ? "bg-teal/15 text-teal" : "bg-raised text-muted"}`}>
                  {isDone ? <Check className="size-4" aria-label={`Tarefa ${t.n} concluída`} /> : t.n}
                </span>
                <span className="w-16 shrink-0 text-right sm:w-24">
                  <span className="block text-lg font-semibold tabular-nums leading-tight">{fmt(t.mobs)}</span>
                  <span className="block text-[11px] text-muted">mobs</span>
                </span>
                <Thumb src={t.src} fallback={t.fallback} alt={t.pokemon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.pokemon}</span>
                  <span className="mt-0.5 block text-xs text-muted sm:hidden"><Badge tone={HUNT_TONE[t.hunt]}>{t.hunt}</Badge></span>
                </span>
                <span className="hidden w-20 shrink-0 justify-center sm:flex"><Badge tone={HUNT_TONE[t.hunt]}>{t.hunt}</Badge></span>
                <span className="flex w-24 shrink-0 justify-end sm:w-28">
                  {!ready ? null : isCurrent ? (
                    <button type="button" onClick={() => save(t.n + 1)} className="inline-flex items-center gap-1 rounded-lg bg-gold px-2.5 py-1.5 text-xs font-semibold text-ink hover:opacity-90">
                      <Target className="size-3.5" aria-hidden /> Concluir
                    </button>
                  ) : isDone ? (
                    <button type="button" onClick={() => save(t.n)} className={smallButton}>Voltar aqui</button>
                  ) : (
                    <button type="button" onClick={() => save(t.n)} className={`${smallButton} inline-flex items-center gap-1`} title="Marcar que você está nesta tarefa (as anteriores contam como feitas)">
                      <Lock className="size-3" aria-hidden /> Estou aqui
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
