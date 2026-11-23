"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeftRight, Check, HandCoins, Minus, Plus, Search, Store, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { MAX_MEDAL_QTY, computeMatches, type ListingKind, type Match, type MatchLine, type MedalListing } from "@/lib/guild/medalTrades";
import { normalize } from "@/lib/pokemonFilters";
import { createPublicClient } from "@/lib/supabase/client";

export type TradeMedal = { id: number; name: string; spriteId: number };
export type TradeTab = "lista" | "matches" | "mercado";

type State = { me: { id: number; name: string }; members: { id: number; name: string }[]; listings: MedalListing[]; unread: number[] };

const POLL_MS = 30_000;
const DEBOUNCE_MS = 350;

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Troca de medalhas: cada um lista o que tem e o que quer, e o site cruza as listas e avisa quando bate. */
export function MedalTradeView({ medals, initialTab }: { medals: TradeMedal[]; initialTab: TradeTab }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<TradeTab>(initialTab);
  /** Quem tinha match novo quando a aba de matches foi aberta (para o selo "novo" durar enquanto a pessoa lê). */
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const inFlight = useRef(false);
  const queued = useRef(false);

  const medalById = useMemo(() => new Map(medals.map((m) => [m.id, m])), [medals]);

  const load = useCallback(async () => {
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const response = await fetch("/api/guild/medal-trades", { cache: "no-store" });
      if (response.status === 401) return router.refresh();
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar a troca de medalhas."));
      setState({ me: data.me as State["me"], members: data.members as State["members"], listings: data.listings as MedalListing[], unread: data.unread as number[] });
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar a troca de medalhas.");
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        void load();
      }
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Tempo real + rede de segurança (só com a aba do navegador visível).
  useEffect(() => {
    const client = createPublicClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const kick = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), DEBOUNCE_MS);
    };
    const channel = client?.channel("guild-medal-trades").on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_listings" }, kick).subscribe();
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(timer);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [load]);

  // Abriu a aba de matches: marca os avisos como vistos (o sino zera), mas guarda quem era novo para destacar.
  const unreadKey = state?.unread.join(",") ?? "";
  useEffect(() => {
    if (tab !== "matches" || !state || state.unread.length === 0) return;
    setFresh((old) => new Set([...old, ...state.unread]));
    void fetch("/api/guild/medal-notifications", { method: "POST" }).then(() => window.dispatchEvent(new Event("guild-medal-read")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a mudança nos avisos não vistos
  }, [tab, unreadKey]);

  const mine = useMemo(() => state?.listings.filter((l) => l.memberId === state.me.id) ?? [], [state]);
  const matches = useMemo(() => (state ? computeMatches(state.listings, state.me.id) : []), [state]);
  const names = useMemo(() => new Map(state?.members.map((m) => [m.id, m.name]) ?? []), [state]);

  /** Muda a quantidade na hora (otimista) e confirma com o servidor; se falhar, volta ao que o banco tem. */
  async function setQty(medalId: number, kind: ListingKind, qty: number) {
    if (!state) return;
    const next = Math.min(Math.max(qty, 0), MAX_MEDAL_QTY);
    setNotice("");
    setState((s) => {
      if (!s) return s;
      const rest = s.listings.filter((l) => !(l.memberId === s.me.id && l.medalId === medalId && l.kind === kind));
      return { ...s, listings: next > 0 ? [...rest, { memberId: s.me.id, medalId, kind, qty: next }] : rest };
    });
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ medalId, kind, qty: next }) });
      const data = await readJson(response);
      if (response.status === 401) return router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível salvar.");
      void load();
    }
  }

  async function markDone(match: Match, line: MatchLine, direction: "give" | "get", qty: number) {
    const medal = medalById.get(line.medalId);
    const other = names.get(match.otherId) ?? "a outra pessoa";
    const text = direction === "give" ? `Marcar que você entregou ${qty}x ${medal?.name} para ${other}?` : `Marcar que você recebeu ${qty}x ${medal?.name} de ${other}?`;
    if (!window.confirm(`${text}\n\nA medalha sai da lista dos dois (só essa quantidade).`)) return;
    setNotice("");
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "done", otherId: match.otherId, medalId: line.medalId, direction, qty }) });
      const data = await readJson(response);
      if (response.status === 401) return router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível marcar a troca."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível marcar a troca.");
    }
    void load();
  }

  if (loadError && !state) {
    return (
      <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {loadError}
      </p>
    );
  }
  if (!state) return <p className="text-sm text-muted">Carregando...</p>;

  const tabs: { key: TradeTab; label: string; icon: typeof HandCoins; count?: number }[] = [
    { key: "lista", label: "Minha lista", icon: HandCoins },
    { key: "matches", label: "Matches", icon: ArrowLeftRight, count: matches.length },
    { key: "mercado", label: "Mercado", icon: Store },
  ];
  const newMatches = matches.filter((m) => state.unread.includes(m.otherId)).length;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Seções da troca de medalhas" className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${tab === key ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
            {key === "matches" && count ? <span className={`rounded-full px-1.5 text-xs ${newMatches > 0 ? "bg-gold text-ink" : "bg-raised text-muted"}`}>{newMatches > 0 ? `${newMatches} novo${newMatches > 1 ? "s" : ""}` : count}</span> : null}
          </button>
        ))}
      </div>

      {notice && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      {tab === "lista" && <MyLists medals={medals} mine={mine} onQty={setQty} />}
      {tab === "matches" && <Matches matches={matches} names={names} medalById={medalById} fresh={fresh} hasLists={mine.length > 0} onDone={markDone} />}
      {tab === "mercado" && <Market medals={medals} listings={state.listings} names={names} meId={state.me.id} />}
    </div>
  );
}

// ── Minha lista ───────────────────────────────────────────────────────────────

function MyLists({ medals, mine, onQty }: { medals: TradeMedal[]; mine: MedalListing[]; onQty: (medalId: number, kind: ListingKind, qty: number) => void }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ListColumn kind="have" title="Tenho para trocar" hint="Medalhas que você pode entregar." medals={medals} mine={mine} onQty={onQty} />
      <ListColumn kind="want" title="Quero" hint="Medalhas que você está procurando." medals={medals} mine={mine} onQty={onQty} />
    </div>
  );
}

function ListColumn({ kind, title, hint, medals, mine, onQty }: { kind: ListingKind; title: string; hint: string; medals: TradeMedal[]; mine: MedalListing[]; onQty: (medalId: number, kind: ListingKind, qty: number) => void }) {
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(medals.map((m) => [m.id, m])), [medals]);
  const items = mine.filter((l) => l.kind === kind).sort((a, b) => a.medalId - b.medalId);
  const quantities = new Map(items.map((l) => [l.medalId, l.qty]));
  const otherKind = new Set(mine.filter((l) => l.kind !== kind).map((l) => l.medalId));
  const total = items.reduce((sum, l) => sum + l.qty, 0);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? medals.filter((m) => normalize(m.name).includes(q) || String(m.id) === q) : medals;
  }, [medals, query]);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted">
            {hint} {items.length > 0 && <span>({items.length} {items.length === 1 ? "medalha" : "medalhas"}, {total} no total)</span>}
          </p>
        </div>
        <button type="button" onClick={() => setPicking((v) => !v)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${picking ? "border border-line text-muted hover:text-fg" : "bg-gold text-ink hover:opacity-90"}`}>
          {picking ? <><X className="size-4" aria-hidden /> Fechar</> : <><Plus className="size-4" aria-hidden /> Adicionar</>}
        </button>
      </div>

      {picking && (
        <div className="space-y-3 rounded-lg border border-line bg-raised p-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar medalha por nome ou número" className="w-full rounded-lg border border-line bg-ink py-2 pl-9 pr-3 text-sm outline-none focus:border-gold/60" />
          </label>
          <p className="text-xs text-muted">Toque numa medalha para adicionar uma unidade. Toque de novo para somar mais.</p>
          <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {filtered.map((m) => {
              const blocked = otherKind.has(m.id);
              const qty = quantities.get(m.id) ?? 0;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={blocked || qty >= MAX_MEDAL_QTY}
                    onClick={() => onQty(m.id, kind, qty + 1)}
                    title={blocked ? `Já está na lista “${kind === "have" ? "Quero" : "Tenho"}”` : `Adicionar ${m.name}`}
                    className={`relative flex w-full flex-col items-center gap-1 rounded-lg border bg-black/25 px-1.5 py-2 text-center text-xs transition-colors enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${qty > 0 ? "border-gold/70" : "border-line"}`}
                  >
                    {qty > 0 && <span className="absolute right-1 top-1 rounded-full bg-gold px-1.5 text-[10px] font-bold text-ink">{qty}</span>}
                    <MedalBadge spriteId={m.spriteId} className="size-10" />
                    <span className="line-clamp-1 font-medium">{m.name}</span>
                    <span className="text-[10px] text-muted">{blocked ? "na outra lista" : `#${m.id}`}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="col-span-full py-4 text-center text-sm text-muted">Nenhuma medalha com esse nome.</li>}
          </ul>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-muted">Nada por aqui ainda. Use “Adicionar”.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((l) => {
            const medal = byId.get(l.medalId);
            return (
              <li key={l.medalId} className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3 py-2">
                <MedalBadge spriteId={medal?.spriteId ?? l.medalId} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{medal?.name ?? `Medalha #${l.medalId}`}</span>
                  <span className="text-xs text-muted">#{l.medalId}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => onQty(l.medalId, kind, l.qty - 1)} disabled={l.qty <= 1} aria-label="Diminuir quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                  <button type="button" onClick={() => onQty(l.medalId, kind, l.qty + 1)} disabled={l.qty >= MAX_MEDAL_QTY} aria-label="Aumentar quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
                    <Plus className="size-4" aria-hidden />
                  </button>
                </span>
                <button type="button" onClick={() => onQty(l.medalId, kind, 0)} aria-label={`Remover ${medal?.name ?? "medalha"}`} className="grid size-8 place-items-center rounded-md text-muted hover:text-red-300">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Matches ───────────────────────────────────────────────────────────────────

function Matches({ matches, names, medalById, fresh, hasLists, onDone }: { matches: Match[]; names: Map<number, string>; medalById: Map<number, TradeMedal>; fresh: Set<number>; hasLists: boolean; onDone: (match: Match, line: MatchLine, direction: "give" | "get", qty: number) => void }) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="Nenhum match por enquanto"
        description={hasLists ? "Quando alguém colocar uma medalha que você quer, ou quiser uma que você tem, ela aparece aqui e o sino da guilda avisa." : "Monte a sua lista em “Minha lista” (o que você tem e o que você quer). Os matches aparecem aqui."}
      />
    );
  }
  return (
    <ul className="space-y-4">
      {matches.map((m) => (
        <li key={m.otherId}>
          <Card className={`space-y-4 ${m.full ? "border-gold/50" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{names.get(m.otherId) ?? "Membro"}</h2>
              <Badge tone={m.full ? "gold" : "muted"}>{m.full ? "Troca completa" : "Match parcial"}</Badge>
              {fresh.has(m.otherId) && <Badge tone="teal">novo</Badge>}
            </div>
            <p className="text-sm text-muted">
              {m.full ? "Vocês dois têm o que o outro quer. Combinem no Discord da guilda." : m.give.length > 0 ? "Você tem o que essa pessoa quer, mas ela não tem nada da sua lista de “quero”." : "Essa pessoa tem o que você quer, mas ela não procura nada que você tenha."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <LineColumn title="Você entrega" lines={m.give} direction="give" medalById={medalById} onDone={(line, qty) => onDone(m, line, "give", qty)} />
              <LineColumn title="Você recebe" lines={m.get} direction="get" medalById={medalById} onDone={(line, qty) => onDone(m, line, "get", qty)} />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function LineColumn({ title, lines, direction, medalById, onDone }: { title: string; lines: MatchLine[]; direction: "give" | "get"; medalById: Map<number, TradeMedal>; onDone: (line: MatchLine, qty: number) => void }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-muted">{title}</h3>
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">Nada deste lado.</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line) => (
            <MatchLineRow key={`${direction}-${line.medalId}-${line.qty}`} line={line} medal={medalById.get(line.medalId)} onDone={onDone} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchLineRow({ line, medal, onDone }: { line: MatchLine; medal: TradeMedal | undefined; onDone: (line: MatchLine, qty: number) => void }) {
  const [qty, setQty] = useState(line.qty);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3 py-2">
      <MedalBadge spriteId={medal?.spriteId ?? line.medalId} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{medal?.name ?? `Medalha #${line.medalId}`}</span>
        <span className="text-xs text-muted">até {line.qty}</span>
      </span>
      {line.qty > 1 && (
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantidade trocada" className="rounded-md border border-line bg-ink px-1.5 py-1 text-sm">
          {Array.from({ length: line.qty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}x</option>
          ))}
        </select>
      )}
      <button type="button" onClick={() => onDone(line, qty)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal/15 px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal/25">
        <Check className="size-3.5" aria-hidden /> Troca feita
      </button>
    </li>
  );
}

// ── Mercado ───────────────────────────────────────────────────────────────────

function Market({ medals, listings, names, meId }: { medals: TradeMedal[]; listings: MedalListing[]; names: Map<number, string>; meId: number }) {
  const [query, setQuery] = useState("");
  const rows = useMemo(() => {
    const q = normalize(query);
    const byMedal = new Map<number, { have: MedalListing[]; want: MedalListing[] }>();
    for (const l of listings) {
      const row = byMedal.get(l.medalId) ?? { have: [], want: [] };
      row[l.kind].push(l);
      byMedal.set(l.medalId, row);
    }
    return medals
      .filter((m) => byMedal.has(m.id) && (!q || normalize(m.name).includes(q) || String(m.id) === q))
      .map((m) => ({ medal: m, ...byMedal.get(m.id)! }));
  }, [medals, listings, query]);

  const who = (list: MedalListing[]) =>
    list.map((l) => (
      <span key={l.memberId} className={`rounded-full border px-2 py-0.5 text-xs ${l.memberId === meId ? "border-gold/50 bg-gold/10 text-gold" : "border-line bg-ink"}`}>
        {l.memberId === meId ? "Você" : names.get(l.memberId) ?? "Membro"}
        {l.qty > 1 && <b className="ml-1 font-semibold">×{l.qty}</b>}
      </span>
    ));

  return (
    <div className="space-y-4">
      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar medalha" className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-gold/60" />
      </label>
      {rows.length === 0 ? (
        <EmptyState icon={Store} title={query ? "Nada com esse nome" : "O mercado está vazio"} description={query ? "Nenhuma medalha com esse nome foi oferecida ou procurada." : "Assim que alguém adicionar medalhas, elas aparecem aqui."} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map(({ medal, have, want }) => (
            <li key={medal.id} className="flex gap-3 rounded-xl border border-line bg-panel p-3">
              <MedalBadge spriteId={medal.spriteId} className="size-12" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold">{medal.name} <span className="text-xs font-normal text-muted">#{medal.id}</span></p>
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-teal">Tem</p>
                  <div className="flex flex-wrap gap-1.5">{have.length ? who(have) : <span className="text-xs text-muted">ninguém</span>}</div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gold">Quer</p>
                  <div className="flex flex-wrap gap-1.5">{want.length ? who(want) : <span className="text-xs text-muted">ninguém</span>}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

