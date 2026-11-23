"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, HandCoins, Minus, Plus, Search, Store, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { MAX_MEDAL_QTY, candidatesFor, type MedalOffer, type TradeCandidate } from "@/lib/guild/medalTrades";
import { normalize } from "@/lib/pokemonFilters";
import { createPublicClient } from "@/lib/supabase/client";
import { MedalPicker, type TradeMedal } from "./MedalPicker";

export type { TradeMedal };
export type TradeTab = "minhas" | "mercado";

type State = { me: { id: number; name: string }; members: { id: number; name: string }[]; offers: MedalOffer[]; unread: number[] };

const POLL_MS = 30_000;
const DEBOUNCE_MS = 350;

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Troca de medalhas: cada medalha que você oferece é um card, com o que você aceita em troca e as trocas possíveis dentro dele. */
export function MedalTradeView({ medals, initialTab }: { medals: TradeMedal[]; initialTab: TradeTab }) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<TradeTab>(initialTab);
  /** Quem tinha troca nova quando a tela foi aberta (o selo "novo" dura enquanto a pessoa lê, mesmo com o sino já zerado). */
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
      setState({ me: data.me as State["me"], members: data.members as State["members"], offers: data.offers as MedalOffer[], unread: data.unread as number[] });
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
      ?.channel("guild-medal-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_offers" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_offer_wants" }, kick)
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

  // Abriu "Minhas medalhas": marca os avisos como vistos (o sino zera), mas guarda quem era novo para destacar.
  const unreadKey = state?.unread.join(",") ?? "";
  useEffect(() => {
    if (tab !== "minhas" || !state || state.unread.length === 0) return;
    setFresh((old) => new Set([...old, ...state.unread]));
    void fetch("/api/guild/medal-notifications", { method: "POST" }).then(() => window.dispatchEvent(new Event("guild-medal-read")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a mudança nos avisos não vistos
  }, [tab, unreadKey]);

  const names = useMemo(() => new Map(state?.members.map((m) => [m.id, m.name]) ?? []), [state]);
  const mine = useMemo(() => (state ? state.offers.filter((o) => o.memberId === state.me.id).sort((a, b) => a.medalId - b.medalId) : []), [state]);

  /** Aplica a mudança na hora (otimista) e confirma com o servidor; se falhar, volta ao que o banco tem. */
  async function send(body: Record<string, unknown>, optimistic: (offers: MedalOffer[], meId: number) => MedalOffer[]) {
    if (!state) return;
    setNotice("");
    setState((s) => (s ? { ...s, offers: optimistic(s.offers, s.me.id) } : s));
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await readJson(response);
      if (response.status === 401) return router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível salvar.");
      void load();
    }
  }

  const setQty = (medalId: number, qty: number) => {
    const next = Math.min(Math.max(qty, 0), MAX_MEDAL_QTY);
    return send({ medalId, qty: next }, (offers, meId) => {
      const rest = offers.filter((o) => !(o.memberId === meId && o.medalId === medalId));
      if (next === 0) return rest;
      const current = offers.find((o) => o.memberId === meId && o.medalId === medalId);
      return [...rest, { memberId: meId, medalId, qty: next, wants: current?.wants ?? [] }];
    });
  };

  const setWants = (medalId: number, wants: number[]) =>
    send({ medalId, wants }, (offers, meId) => offers.map((o) => (o.memberId === meId && o.medalId === medalId ? { ...o, wants: [...wants].sort((a, b) => a - b) } : o)));

  async function markDone(offer: MedalOffer, candidate: TradeCandidate, qty: number) {
    const mineName = medalById.get(offer.medalId)?.name ?? `#${offer.medalId}`;
    const theirName = medalById.get(candidate.theirMedalId)?.name ?? `#${candidate.theirMedalId}`;
    const other = names.get(candidate.otherId) ?? "a outra pessoa";
    if (!window.confirm(`Marcar a troca feita?\n\nVocê deu ${qty}x ${mineName} e ${other} deu ${qty}x ${theirName}.\n\nAs duas ofertas diminuem ${qty} (e somem se chegarem a 0).`)) return;
    setNotice("");
    try {
      const response = await fetch("/api/guild/medal-trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "done", otherId: candidate.otherId, myMedalId: offer.medalId, theirMedalId: candidate.theirMedalId, qty }) });
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

  const tabs: { key: TradeTab; label: string; icon: typeof HandCoins }[] = [
    { key: "minhas", label: "Minhas medalhas", icon: HandCoins },
    { key: "mercado", label: "Mercado", icon: Store },
  ];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Seções da troca de medalhas" className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${tab === key ? "border-gold/60 bg-gold/10 text-gold" : "border-line text-muted hover:text-fg"}`}
          >
            <Icon className="size-4" aria-hidden /> {label}
            {key === "minhas" && state.unread.length > 0 && <span className="rounded-full bg-gold px-1.5 text-xs text-ink">{state.unread.length} novo{state.unread.length > 1 ? "s" : ""}</span>}
          </button>
        ))}
      </div>

      {notice && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {notice}
        </p>
      )}

      {tab === "minhas" && <MyOffers medals={medals} medalById={medalById} mine={mine} offers={state.offers} names={names} fresh={fresh} onQty={setQty} onWants={setWants} onDone={markDone} />}
      {tab === "mercado" && <Market medals={medals} medalById={medalById} offers={state.offers} mine={mine} names={names} meId={state.me.id} />}
    </div>
  );
}

// ── Minhas medalhas ───────────────────────────────────────────────────────────

type MyOffersProps = {
  medals: TradeMedal[];
  medalById: Map<number, TradeMedal>;
  mine: MedalOffer[];
  offers: MedalOffer[];
  names: Map<number, string>;
  fresh: Set<number>;
  onQty: (medalId: number, qty: number) => void;
  onWants: (medalId: number, wants: number[]) => void;
  onDone: (offer: MedalOffer, candidate: TradeCandidate, qty: number) => void;
};

function MyOffers({ medals, medalById, mine, offers, names, fresh, onQty, onWants, onDone }: MyOffersProps) {
  const [adding, setAdding] = useState(false);
  const chosen = new Map(mine.map((o) => [o.medalId, o.qty]));
  // Uma medalha que você aceita receber não pode ser uma das que você oferece.
  const blocked = new Map<number, string>();
  for (const o of mine) for (const w of o.wants) blocked.set(w, "você pediu em troca");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">Adicione as medalhas que você tem para trocar. Dentro de cada uma, escolha o que você aceitaria receber, e as trocas possíveis aparecem ali mesmo.</p>
        <button type="button" onClick={() => setAdding((v) => !v)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${adding ? "border border-line text-muted hover:text-fg" : "bg-gold text-ink hover:opacity-90"}`}>
          {adding ? <><X className="size-4" aria-hidden /> Fechar</> : <><Plus className="size-4" aria-hidden /> Adicionar medalha</>}
        </button>
      </div>

      {adding && <MedalPicker medals={medals} chosen={chosen} blocked={blocked} hint="Toque numa medalha para adicionar uma unidade. Toque de novo para somar mais." onPick={(id) => onQty(id, (chosen.get(id) ?? 0) + 1)} />}

      {mine.length === 0 ? (
        <EmptyState icon={HandCoins} title="Você ainda não colocou nada para trocar" description="Use “Adicionar medalha”, escolha o que você tem e depois o que aceitaria em troca." />
      ) : (
        <ul className="space-y-4">
          {mine.map((offer) => (
            <li key={offer.medalId}>
              <OfferCard offer={offer} medals={medals} medalById={medalById} mine={mine} candidates={candidatesFor(offers, offer)} names={names} fresh={fresh} onQty={onQty} onWants={onWants} onDone={onDone} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type OfferCardProps = {
  offer: MedalOffer;
  medals: TradeMedal[];
  medalById: Map<number, TradeMedal>;
  mine: MedalOffer[];
  candidates: TradeCandidate[];
  names: Map<number, string>;
  fresh: Set<number>;
  onQty: (medalId: number, qty: number) => void;
  onWants: (medalId: number, wants: number[]) => void;
  onDone: (offer: MedalOffer, candidate: TradeCandidate, qty: number) => void;
};

function OfferCard({ offer, medals, medalById, mine, candidates, names, fresh, onQty, onWants, onDone }: OfferCardProps) {
  const [picking, setPicking] = useState(false);
  const medal = medalById.get(offer.medalId);
  const wanted = new Set(offer.wants);

  // Não dá para pedir em troca a própria medalha nem outra que você já oferece.
  const blocked = new Map<number, string>();
  for (const o of mine) blocked.set(o.medalId, o.medalId === offer.medalId ? "é esta oferta" : "você oferece");

  const toggle = (id: number) => onWants(offer.medalId, wanted.has(id) ? offer.wants.filter((w) => w !== id) : [...offer.wants, id]);
  const fullCount = candidates.filter((c) => c.full).length;

  return (
    <Card className={`space-y-5 ${fullCount > 0 ? "border-gold/50" : ""}`}>
      <div className="flex items-center gap-3">
        <MedalBadge spriteId={medal?.spriteId ?? offer.medalId} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">Tenho para trocar</p>
          <h2 className="truncate text-lg font-semibold tracking-tight">{medal?.name ?? `Medalha #${offer.medalId}`} <span className="text-xs font-normal text-muted">#{offer.medalId}</span></h2>
        </div>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onQty(offer.medalId, offer.qty - 1)} disabled={offer.qty <= 1} aria-label="Diminuir quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">{offer.qty}</span>
          <button type="button" onClick={() => onQty(offer.medalId, offer.qty + 1)} disabled={offer.qty >= MAX_MEDAL_QTY} aria-label="Aumentar quantidade" className="grid size-8 place-items-center rounded-md border border-line text-muted hover:text-fg disabled:opacity-30">
            <Plus className="size-4" aria-hidden />
          </button>
        </span>
        <button type="button" onClick={() => onQty(offer.medalId, 0)} aria-label={`Remover ${medal?.name ?? "medalha"}`} className="grid size-8 place-items-center rounded-md text-muted hover:text-red-300">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-medium uppercase tracking-[0.15em] text-gold">Quero em troca</h3>
          <button type="button" onClick={() => setPicking((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-muted hover:text-fg">
            {picking ? <><X className="size-3.5" aria-hidden /> Fechar</> : <><Plus className="size-3.5" aria-hidden /> {offer.wants.length > 0 ? "Editar" : "Escolher medalhas"}</>}
          </button>
        </div>
        {offer.wants.length === 0 ? (
          <p className="text-sm text-muted">Nada escolhido: você aceita qualquer proposta. Escolha medalhas para o site achar as trocas que combinam.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {offer.wants.map((id) => (
              <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pl-1 pr-1.5 text-xs">
                <MedalBadge spriteId={medalById.get(id)?.spriteId ?? id} className="size-5" />
                {medalById.get(id)?.name ?? `#${id}`}
                <button type="button" onClick={() => toggle(id)} aria-label={`Tirar ${medalById.get(id)?.name ?? id} dos pedidos`} className="text-muted hover:text-red-300">
                  <X className="size-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {picking && (
          <div className="mt-3">
            <MedalPicker medals={medals} chosen={new Map(offer.wants.map((id) => [id, 1]))} blocked={blocked} checkOnly hint="Toque para marcar as medalhas que você aceitaria receber. Toque de novo para desmarcar." onPick={toggle} />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-teal">Possíveis trocas {candidates.length > 0 && <span className="text-muted">({candidates.length})</span>}</h3>
        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">{offer.wants.length === 0 ? "Ainda ninguém quer esta medalha. Escolha o que você aceita em troca para achar mais combinações." : "Nenhuma troca combina por enquanto. Quando alguém colocar algo que bata, o sino avisa."}</p>
        ) : (
          <ul className="space-y-2">
            {candidates.map((c) => (
              <CandidateRow key={`${c.otherId}-${c.theirMedalId}-${c.qty}`} candidate={c} medal={medalById.get(c.theirMedalId)} other={names.get(c.otherId) ?? "Membro"} isNew={fresh.has(c.otherId)} onDone={(qty) => onDone(offer, c, qty)} />
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}

function CandidateRow({ candidate: c, medal, other, isNew, onDone }: { candidate: TradeCandidate; medal: TradeMedal | undefined; other: string; isNew: boolean; onDone: (qty: number) => void }) {
  const [qty, setQty] = useState(c.qty);
  const tag = c.full ? { text: "Troca completa", tone: "gold" as const } : c.theyAccept ? { text: "Ele quer a sua", tone: "muted" as const } : { text: "Você aceita esta", tone: "muted" as const };
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-lg border bg-raised px-3 py-2 ${c.full ? "border-gold/40" : "border-line"}`}>
      <MedalBadge spriteId={medal?.spriteId ?? c.theirMedalId} className="size-10" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {other} <span className="font-normal text-muted">oferece</span> {medal?.name ?? `#${c.theirMedalId}`} <span className="text-muted">×{c.theirQty}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap gap-1.5">
          <Badge tone={tag.tone}>{tag.text}</Badge>
          {isNew && <Badge tone="teal">novo</Badge>}
        </span>
      </span>
      {c.qty > 1 && (
        <select value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Quantidade trocada" className="rounded-md border border-line bg-ink px-1.5 py-1 text-sm">
          {Array.from({ length: c.qty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}x</option>
          ))}
        </select>
      )}
      <button type="button" onClick={() => onDone(qty)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal/15 px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal/25">
        <Check className="size-3.5" aria-hidden /> Troca feita
      </button>
    </li>
  );
}

// ── Mercado ───────────────────────────────────────────────────────────────────

const WANTS_PREVIEW = 6;

/** Só as ofertas da guilda, cada uma com o que aceita em troca (sem listas de "quero" soltas). */
function Market({ medals, medalById, offers, mine, names, meId }: { medals: TradeMedal[]; medalById: Map<number, TradeMedal>; offers: MedalOffer[]; mine: MedalOffer[]; names: Map<number, string>; meId: number }) {
  const [query, setQuery] = useState("");
  const [onlyMatches, setOnlyMatches] = useState(false);

  // Ofertas de outras pessoas que combinam com alguma oferta minha.
  const matching = useMemo(() => {
    const set = new Set<string>();
    for (const m of mine) for (const c of candidatesFor(offers, m)) set.add(`${c.otherId}:${c.theirMedalId}`);
    return set;
  }, [mine, offers]);

  const rows = useMemo(() => {
    const q = normalize(query);
    const order = new Map(medals.map((m, i) => [m.id, i]));
    return offers
      .filter((o) => {
        if (onlyMatches && !matching.has(`${o.memberId}:${o.medalId}`)) return false;
        if (!q) return true;
        const hit = (id: number) => normalize(medalById.get(id)?.name ?? "").includes(q) || String(id) === q;
        return hit(o.medalId) || o.wants.some(hit) || normalize(names.get(o.memberId) ?? "").includes(q);
      })
      .sort((a, b) => (order.get(a.medalId) ?? 0) - (order.get(b.medalId) ?? 0) || a.memberId - b.memberId);
  }, [offers, query, onlyMatches, matching, medals, medalById, names]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative block min-w-56 max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar medalha ou jogador" className="w-full rounded-lg border border-line bg-panel py-2 pl-9 pr-3 text-sm outline-none focus:border-gold/60" />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={onlyMatches} onChange={(e) => setOnlyMatches(e.target.checked)} className="size-4 accent-[#f2b84b]" />
          Só as que combinam comigo
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Store} title={query || onlyMatches ? "Nada encontrado" : "O mercado está vazio"} description={query || onlyMatches ? "Nenhuma oferta bate com essa busca." : "Assim que alguém adicionar medalhas para trocar, elas aparecem aqui."} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((o) => {
            const medal = medalById.get(o.medalId);
            const isMine = o.memberId === meId;
            return (
              <li key={`${o.memberId}-${o.medalId}`} className={`flex gap-3 rounded-xl border bg-panel p-3 ${matching.has(`${o.memberId}:${o.medalId}`) ? "border-gold/50" : "border-line"}`}>
                <MedalBadge spriteId={medal?.spriteId ?? o.medalId} className="size-12" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold">{medal?.name ?? `#${o.medalId}`} <span className="text-xs font-normal text-muted">×{o.qty}</span></p>
                    {isMine ? <Badge tone="gold">Sua oferta</Badge> : matching.has(`${o.memberId}:${o.medalId}`) && <Badge tone="teal">Combina com você</Badge>}
                  </div>
                  <p className="text-xs text-muted">de {isMine ? "você" : names.get(o.memberId) ?? "Membro"}</p>
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-gold">Aceita em troca</p>
                    {o.wants.length === 0 ? (
                      <span className="text-xs text-muted">qualquer proposta</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {o.wants.slice(0, WANTS_PREVIEW).map((id) => (
                          <span key={id} className="rounded-full border border-line bg-ink px-2 py-0.5 text-xs">{medalById.get(id)?.name ?? `#${id}`}</span>
                        ))}
                        {o.wants.length > WANTS_PREVIEW && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">+{o.wants.length - WANTS_PREVIEW}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
