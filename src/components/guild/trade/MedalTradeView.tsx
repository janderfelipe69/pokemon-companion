"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeftRight, Check, ChevronDown, HandCoins, Heart, Minus, Plus, Search, Store, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { MAX_MEDAL_QTY, computeMatches, type Match, type MatchLine, type MedalOffer, type MedalWant } from "@/lib/guild/medalTrades";
import { normalize } from "@/lib/pokemonFilters";
import { createPublicClient } from "@/lib/supabase/client";
import { MedalPicker, type TradeMedal } from "./MedalPicker";

export type { TradeMedal };
export type TradeTab = "tenho" | "quero" | "trocas" | "mercado";

type State = { me: { id: number; name: string }; members: { id: number; name: string }[]; offers: MedalOffer[]; wants: MedalWant[]; unread: number[] };

const POLL_MS = 30_000;
const DEBOUNCE_MS = 350;
/** A lista de "quero" é marcada de uma vez: espera um instante depois do último toque para salvar tudo junto. */
const SAVE_WANTS_MS = 600;

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Troca de medalhas: abas "Tenho" e "Quero", as trocas possíveis entre os membros e o mercado com as medalhas de todo mundo. */
export function MedalTradeView({ medals, initialTab }: { medals: TradeMedal[]; initialTab: TradeTab }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<TradeTab>(initialTab);
  /** Quem tinha troca nova quando a tela foi aberta (o selo "novo" dura enquanto a pessoa lê, mesmo com o sino já zerado). */
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  /** Lista de "quero" ainda não salva (null = vale a do servidor). */
  const [wantDraft, setWantDraft] = useState<number[] | null>(null);
  const latestWants = useRef<number[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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
      setState({ me: data.me as State["me"], members: data.members as State["members"], offers: data.offers as MedalOffer[], wants: data.wants as MedalWant[], unread: data.unread as number[] });
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
    const channel = client
      ?.channel("guild-medal-trades")
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_offers" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_wants" }, kick)
      .subscribe();
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

  // Abriu "Trocas possíveis": marca os avisos como vistos (o sino zera), mas guarda quem era novo para destacar.
  const unreadKey = state?.unread.join(",") ?? "";
  useEffect(() => {
    if (tab !== "trocas" || !state || state.unread.length === 0) return;
    setFresh((old) => new Set([...old, ...state.unread]));
    void fetch("/api/guild/medal-notifications", { method: "POST" }).then(() => window.dispatchEvent(new Event("guild-medal-read")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a mudança nos avisos não vistos
  }, [tab, unreadKey]);

  // Sair da página com a lista de "quero" ainda por salvar: não perde nada.
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const names = useMemo(() => new Map(state?.members.map((m) => [m.id, m.name]) ?? []), [state]);
  const myOffers = useMemo(() => (state ? state.offers.filter((o) => o.memberId === state.me.id).sort((a, b) => a.medalId - b.medalId) : []), [state]);
  const serverWants = useMemo(() => (state ? state.wants.filter((w) => w.memberId === state.me.id).map((w) => w.medalId) : []), [state]);
  const myWants = wantDraft ?? serverWants;
  const matches = useMemo(() => (state ? computeMatches(state.offers, state.wants, state.me.id) : []), [state]);

  /** Quantidade que eu tenho: muda na hora (otimista) e confirma com o servidor; se falhar, volta ao que o banco tem. */
  async function setQty(medalId: number, qty: number) {
    if (!state) return;
    const next = Math.min(Math.max(qty, 0), MAX_MEDAL_QTY);
    setNotice("");
    setState((s) => {
      if (!s) return s;
      const rest = s.offers.filter((o) => !(o.memberId === s.me.id && o.medalId === medalId));
      return { ...s, offers: next > 0 ? [...rest, { memberId: s.me.id, medalId, qty: next }] : rest };
    });
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ medalId, qty: next }) });
      const data = await readJson(response);
      if (response.status === 401) return router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível salvar.");
      void load();
    }
  }

  async function flushWants(list: number[]) {
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wants: list }) });
      const data = await readJson(response);
      if (response.status === 401) return router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      if (latestWants.current === list) {
        // Guarda no estado antes de largar o rascunho para a tela não piscar com a lista antiga.
        setState((s) => (s ? { ...s, wants: [...s.wants.filter((w) => w.memberId !== s.me.id), ...list.map((medalId) => ({ memberId: s.me.id, medalId }))] } : s));
        latestWants.current = null;
        setWantDraft(null);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível salvar.");
      latestWants.current = null;
      setWantDraft(null);
    }
    void load();
  }

  function changeWants(next: number[]) {
    setNotice("");
    setWantDraft(next);
    latestWants.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flushWants(next), SAVE_WANTS_MS);
  }

  const toggleWant = (id: number) => changeWants(myWants.includes(id) ? myWants.filter((w) => w !== id) : [...myWants, id]);

  async function markDone(match: Match, line: MatchLine, direction: "give" | "get", qty: number) {
    const medal = medalById.get(line.medalId);
    const other = names.get(match.otherId) ?? "a outra pessoa";
    const text = direction === "give" ? `Marcar que você entregou ${qty}x ${medal?.name} para ${other}?` : `Marcar que você recebeu ${qty}x ${medal?.name} de ${other}?`;
    if (!window.confirm(`${text}\n\nA medalha diminui ${qty} em quem entregou e sai do “quero” de quem recebeu.`)) return;
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

  const newMatches = matches.filter((m) => state.unread.includes(m.otherId)).length;
  const tabs: { key: TradeTab; label: string; icon: typeof HandCoins; badge?: string }[] = [
    { key: "tenho", label: "Tenho", icon: HandCoins },
    { key: "quero", label: "Quero", icon: Heart },
    { key: "trocas", label: "Trocas possíveis", icon: ArrowLeftRight, badge: newMatches > 0 ? `${newMatches} novo${newMatches > 1 ? "s" : ""}` : matches.length > 0 ? String(matches.length) : undefined },
    { key: "mercado", label: "Mercado", icon: Store },
  ];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Seções da troca de medalhas" className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${tab === key ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
            {badge && <span className={`rounded-full px-1.5 text-xs ${newMatches > 0 && key === "trocas" ? "bg-gold text-ink" : "bg-raised text-muted"}`}>{badge}</span>}
          </button>
        ))}
      </div>

      {notice && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      {tab === "tenho" && <HaveTab medals={medals} medalById={medalById} mine={myOffers} wanted={new Set(myWants)} onQty={setQty} />}
      {tab === "quero" && <WantTab medals={medals} medalById={medalById} wants={myWants} haveIds={new Set(myOffers.map((o) => o.medalId))} onToggle={toggleWant} onClear={() => changeWants([])} saving={wantDraft !== null} />}
      {tab === "trocas" && <Trades matches={matches} names={names} medalById={medalById} fresh={fresh} hasLists={myOffers.length > 0 || myWants.length > 0} onDone={markDone} />}
      {tab === "mercado" && <Market medals={medals} medalById={medalById} offers={state.offers} wants={state.wants} members={state.members} names={names} meId={state.me.id} />}
    </div>
  );
}

// ── Tenho ─────────────────────────────────────────────────────────────────────

function HaveTab({ medals, medalById, mine, wanted, onQty }: { medals: TradeMedal[]; medalById: Map<number, TradeMedal>; mine: MedalOffer[]; wanted: Set<number>; onQty: (medalId: number, qty: number) => void }) {
  const [adding, setAdding] = useState(false);
  const chosen = new Map(mine.map((o) => [o.medalId, o.qty]));
  const blocked = new Map([...wanted].map((id) => [id, "você quer esta"] as const));
  const total = mine.reduce((sum, o) => sum + o.qty, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Tenho para trocar</h2>
          <p className="text-sm text-muted">
            Adicione as medalhas que você pode entregar, na quantidade que tiver. {mine.length > 0 && <span>({mine.length} {mine.length === 1 ? "medalha" : "medalhas"}, {total} no total)</span>}
          </p>
        </div>
        <button type="button" onClick={() => setAdding((v) => !v)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${adding ? "border border-line text-muted hover:text-fg" : "bg-gold text-ink hover:opacity-90"}`}>
          {adding ? <><X className="size-4" aria-hidden /> Fechar</> : <><Plus className="size-4" aria-hidden /> Adicionar medalha</>}
        </button>
      </div>

      {adding && <MedalPicker medals={medals} chosen={chosen} blocked={blocked} hint="Toque numa medalha para adicionar uma unidade. Toque de novo para somar mais." onPick={(id) => onQty(id, (chosen.get(id) ?? 0) + 1)} />}

      {mine.length === 0 ? (
        <EmptyState icon={HandCoins} title="Você ainda não colocou nada para trocar" description="Use “Adicionar medalha”. Depois, na aba Quero, marque o que você aceitaria receber." />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {mine.map((o) => {
            const medal = medalById.get(o.medalId);
            return (
              <li key={o.medalId} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5">
                <MedalBadge spriteId={medal?.spriteId ?? o.medalId} className="size-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{medal?.name ?? `Medalha #${o.medalId}`}</span>
                  <span className="text-xs text-muted">#{o.medalId}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => onQty(o.medalId, o.qty - 1)} disabled={o.qty <= 1} aria-label="Diminuir quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{o.qty}</span>
                  <button type="button" onClick={() => onQty(o.medalId, o.qty + 1)} disabled={o.qty >= MAX_MEDAL_QTY} aria-label="Aumentar quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
                    <Plus className="size-4" aria-hidden />
                  </button>
                </span>
                <button type="button" onClick={() => onQty(o.medalId, 0)} aria-label={`Remover ${medal?.name ?? "medalha"}`} className="grid size-8 place-items-center rounded-md text-muted hover:text-red-300">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Quero ─────────────────────────────────────────────────────────────────────

function WantTab({ medals, medalById, wants, haveIds, onToggle, onClear, saving }: { medals: TradeMedal[]; medalById: Map<number, TradeMedal>; wants: number[]; haveIds: Set<number>; onToggle: (medalId: number) => void; onClear: () => void; saving: boolean }) {
  const blocked = new Map([...haveIds].map((id) => [id, "você tem esta"] as const));
  const sorted = [...wants].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Quero receber</h2>
          <p className="max-w-xl text-sm text-muted">Marque todas as medalhas que você aceitaria em troca. Essa lista vale para todas as medalhas que você tem. {saving ? <span className="text-gold">Salvando...</span> : wants.length > 0 && <span>({wants.length} marcada{wants.length > 1 ? "s" : ""})</span>}</p>
        </div>
        <button type="button" onClick={onClear} disabled={wants.length === 0} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40">
          Desmarcar todas
        </button>
      </div>

      {sorted.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {sorted.map((id) => (
            <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 py-0.5 pl-1 pr-1.5 text-xs">
              <MedalBadge spriteId={medalById.get(id)?.spriteId ?? id} className="size-5" />
              {medalById.get(id)?.name ?? `#${id}`}
              <button type="button" onClick={() => onToggle(id)} aria-label={`Tirar ${medalById.get(id)?.name ?? id} da lista`} className="text-muted hover:text-red-300">
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <MedalPicker medals={medals} chosen={new Map(wants.map((id) => [id, 1]))} blocked={blocked} checkOnly hint="Toque para marcar. Toque de novo para desmarcar. Pode marcar várias seguidas, o site salva tudo junto." onPick={onToggle} />
    </div>
  );
}

// ── Trocas possíveis ──────────────────────────────────────────────────────────

function Trades({ matches, names, medalById, fresh, hasLists, onDone }: { matches: Match[]; names: Map<number, string>; medalById: Map<number, TradeMedal>; fresh: Set<number>; hasLists: boolean; onDone: (match: Match, line: MatchLine, direction: "give" | "get", qty: number) => void }) {
  if (matches.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="Nenhuma troca possível por enquanto"
        description={hasLists ? "Quando alguém tiver uma medalha que você quer, ou quiser uma que você tem, a troca aparece aqui e o sino da guilda avisa." : "Preencha as abas Tenho e Quero. As trocas possíveis aparecem aqui."}
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
              <Badge tone={m.full ? "gold" : "muted"}>{m.full ? "Troca completa" : "Troca parcial"}</Badge>
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
  const [qty, setQty] = useState(1);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3 py-2">
      <MedalBadge spriteId={medal?.spriteId ?? line.medalId} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{medal?.name ?? `Medalha #${line.medalId}`}</span>
        <span className="text-xs text-muted">{line.qty > 1 ? `${line.qty} disponíveis` : "1 disponível"}</span>
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

const CHIPS_PREVIEW = 12;

/**
 * As medalhas que todo mundo tem. Ao clicar numa, aparecem os donos e o que cada um aceita em troca.
 * Dá para filtrar por jogador e por medalha.
 */
function Market({ medals, medalById, offers, wants, members, names, meId }: { medals: TradeMedal[]; medalById: Map<number, TradeMedal>; offers: MedalOffer[]; wants: MedalWant[]; members: { id: number; name: string }[]; names: Map<number, string>; meId: number }) {
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<number | null>(null);
  const [onlyWanted, setOnlyWanted] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());

  const wantsOf = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const w of wants) map.set(w.memberId, [...(map.get(w.memberId) ?? []), w.medalId]);
    for (const list of map.values()) list.sort((a, b) => a - b);
    return map;
  }, [wants]);
  const myWants = useMemo(() => new Set(wantsOf.get(meId) ?? []), [wantsOf, meId]);
  const myHaves = useMemo(() => new Set(offers.filter((o) => o.memberId === meId).map((o) => o.medalId)), [offers, meId]);

  const holders = useMemo(() => {
    const count = new Map<number, number>();
    for (const o of offers) count.set(o.memberId, (count.get(o.memberId) ?? 0) + 1);
    return members.filter((m) => count.has(m.id)).map((m) => ({ ...m, count: count.get(m.id)! })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [offers, members]);

  const groups = useMemo(() => {
    const q = normalize(query);
    const order = new Map(medals.map((m, i) => [m.id, i]));
    const byMedal = new Map<number, MedalOffer[]>();
    for (const o of offers) {
      if (player !== null && o.memberId !== player) continue;
      if (onlyWanted && !myWants.has(o.medalId)) continue;
      if (q) {
        const medal = medalById.get(o.medalId);
        if (!(normalize(medal?.name ?? "").includes(q) || String(o.medalId) === q)) continue;
      }
      byMedal.set(o.medalId, [...(byMedal.get(o.medalId) ?? []), o]);
    }
    return [...byMedal].sort(([a], [b]) => (order.get(a) ?? 0) - (order.get(b) ?? 0)).map(([medalId, list]) => ({ medalId, list: list.sort((x, y) => (names.get(x.memberId) ?? "").localeCompare(names.get(y.memberId) ?? "", "pt-BR")) }));
  }, [offers, medals, medalById, names, query, player, onlyWanted, myWants]);

  const toggleOpen = (id: number) =>
    setOpen((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-56 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por medalha" className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-gold/60" />
        </label>
        <select value={player ?? ""} onChange={(e) => setPlayer(e.target.value ? Number(e.target.value) : null)} aria-label="Filtrar por jogador" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-gold/60">
          <option value="">Todos os jogadores</option>
          {holders.map((h) => (
            <option key={h.id} value={h.id}>{h.id === meId ? `Você (${h.count})` : `${h.name} (${h.count})`}</option>
          ))}
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyWanted} onChange={(e) => setOnlyWanted(e.target.checked)} className="size-4 accent-[#f2b84b]" />
          Só as que eu quero
        </label>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={Store} title={query || player !== null || onlyWanted ? "Nada encontrado" : "O mercado está vazio"} description={query || player !== null || onlyWanted ? "Nenhuma medalha bate com esses filtros." : "Assim que alguém adicionar medalhas na aba Tenho, elas aparecem aqui."} />
      ) : (
        <ul className="grid items-start gap-3 md:grid-cols-2">
          {groups.map(({ medalId, list }) => {
            const medal = medalById.get(medalId);
            const isOpen = open.has(medalId) || player !== null;
            const total = list.reduce((sum, o) => sum + o.qty, 0);
            return (
              <li key={medalId} className={`rounded-xl border bg-panel ${myWants.has(medalId) ? "border-gold/50" : "border-line"}`}>
                <button type="button" onClick={() => toggleOpen(medalId)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-3 text-left">
                  <MedalBadge spriteId={medal?.spriteId ?? medalId} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold">{medal?.name ?? `#${medalId}`}</span>
                      <span className="text-xs text-muted">#{medalId}</span>
                      {myWants.has(medalId) && <Badge tone="gold">Você quer</Badge>}
                    </span>
                    <span className="text-xs text-muted">{list.length} {list.length === 1 ? "jogador" : "jogadores"} · {total} {total === 1 ? "unidade" : "unidades"}</span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {isOpen && (
                  <ul className="space-y-2 border-t border-line p-3">
                    {list.map((o) => (
                      <Holder key={o.memberId} offer={o} isMe={o.memberId === meId} name={names.get(o.memberId) ?? "Membro"} accepts={wantsOf.get(o.memberId) ?? []} myHaves={myHaves} medalById={medalById} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Holder({ offer, isMe, name, accepts, myHaves, medalById }: { offer: MedalOffer; isMe: boolean; name: string; accepts: number[]; myHaves: Set<number>; medalById: Map<number, TradeMedal> }) {
  const [all, setAll] = useState(false);
  // O que você tem e esse jogador aceita vem primeiro e em dourado.
  const sorted = useMemo(() => [...accepts].sort((a, b) => Number(myHaves.has(b)) - Number(myHaves.has(a)) || a - b), [accepts, myHaves]);
  const shown = all ? sorted : sorted.slice(0, CHIPS_PREVIEW);
  const useful = isMe ? 0 : accepts.filter((id) => myHaves.has(id)).length;

  return (
    <li className="rounded-lg border border-line bg-raised p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{isMe ? "Você" : name}</span>
        <span className="text-xs text-muted">tem ×{offer.qty}</span>
        {useful > 0 && <Badge tone="teal">aceita {useful} {useful === 1 ? "medalha sua" : "medalhas suas"}</Badge>}
      </div>
      <p className="mb-1 mt-2 text-[11px] font-medium uppercase tracking-wider text-gold">Aceita em troca</p>
      {accepts.length === 0 ? (
        <p className="text-xs text-muted">{isMe ? "Você ainda não marcou nada na aba Quero." : "Ainda não marcou o que quer."}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((id) => (
            <span key={id} title={myHaves.has(id) ? "Você tem esta" : undefined} className={`rounded-full border px-2 py-0.5 text-xs ${myHaves.has(id) && !isMe ? "border-teal/50 bg-teal/10 text-teal" : "border-line bg-ink"}`}>
              {medalById.get(id)?.name ?? `#${id}`}
            </span>
          ))}
          {sorted.length > CHIPS_PREVIEW && (
            <button type="button" onClick={() => setAll((v) => !v)} className="rounded-full border border-line px-2 py-0.5 text-xs text-muted hover:text-fg">
              {all ? "ver menos" : `+${sorted.length - CHIPS_PREVIEW}`}
            </button>
          )}
        </div>
      )}
    </li>
  );
}
