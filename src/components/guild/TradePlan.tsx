"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Check, Hand, Hourglass, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { STONE_TIERS, type BoostWant, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import { ago, type ActivityEvent } from "@/lib/guild/boostActivity";
import { personText, type LeftoverHint, type PersonPlan, type PlanChange, type Transfer, type TradePlan as Plan } from "@/lib/guild/boostTrades";
import type { PokemonType } from "@/types/pokemon";

const tierName = (tier: StoneTierKey) => STONE_TIERS.find((t) => t.key === tier)?.label ?? tier;

/** Uma stone com ícone do tipo e a cor dele: "2x Advanced Fire". */
export function StoneChip({ type, tier, qty, done }: { type: PokemonType; tier: StoneTierKey; qty?: number; done?: boolean }) {
  const { label, color } = typeInfo[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${done ? "opacity-60" : ""}`} style={{ borderColor: `${color}99`, backgroundColor: `${color}22` }}>
      {done ? <Check className="size-4 text-teal" aria-hidden /> : <TypeIcon type={type} className="size-4" />}
      {qty !== undefined && `${qty}x `}
      {tierName(tier)} {label}
    </span>
  );
}

/** Re-renderiza de tempos em tempos para os "há 12 s" andarem sozinhos. */
function useTicker(ms = 5000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

// ── Estado da conexão ─────────────────────────────────────────────────────────

/** "Ao vivo" (tempo real conectado) ou "atualiza a cada poucos segundos", com a hora da última atualização. */
export function LiveBadge({ live, lastSync }: { live: boolean; lastSync: number | null }) {
  const now = useTicker();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={live ? "Conectado: o plano muda na hora em que alguém publica." : "Verificando novidades a cada poucos segundos."}>
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-70" />}
        <span className={`relative inline-flex size-2 rounded-full ${live ? "bg-teal" : "bg-muted"}`} />
      </span>
      <span className={live ? "font-medium text-teal" : ""}>{live ? "Ao vivo" : "Atualizando"}</span>
      {lastSync && <span>· {ago(lastSync, now)}</span>}
    </span>
  );
}

const EVENT_TEXT = {
  joined: { Icon: UserPlus, tone: "text-teal", text: (e: ActivityEvent) => `publicou ${e.stones} ${e.stones === 1 ? "stone" : "stones"}` },
  updated: { Icon: UserCheck, tone: "text-gold", text: (e: ActivityEvent) => `atualizou o drop (${e.stones} ${e.stones === 1 ? "stone" : "stones"})` },
  left: { Icon: UserMinus, tone: "text-muted", text: () => "retirou o drop" },
} as const;

/** O que acabou de acontecer na rodada: "Cryt publicou 4 stones · agora". */
export function ActivityFeed({ events }: { events: readonly ActivityEvent[] }) {
  const now = useTicker();
  const recent = events.filter((e) => now - e.at < 10 * 60_000);
  if (recent.length === 0) return null;
  return (
    <ul className="mb-3 space-y-1 rounded-xl border border-line bg-black/20 p-2.5" aria-label="Atividade recente">
      {recent.map((e) => {
        const { Icon, tone, text } = EVENT_TEXT[e.kind];
        return (
          <li key={e.id} className="flex items-center gap-2 text-xs">
            <Icon className={`size-3.5 shrink-0 ${tone}`} aria-hidden />
            <span className="min-w-0 truncate">
              <b className="font-semibold">{e.name}</b> <span className="text-muted">{text(e)}</span>
            </span>
            <span className="flex-1" />
            <span className="shrink-0 text-muted">{ago(e.at, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Avisa quando alguém publicou e o SEU plano mudou: o que passou a receber ou entregar. */
export function ChangesBanner({ changes, onDismiss }: { changes: readonly PlanChange[]; onDismiss: () => void }) {
  if (changes.length === 0) return null;
  return (
    <div role="status" className="mb-3 rounded-xl border border-gold/60 bg-gold/10 p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Bell className="size-4 text-gold" aria-hidden />
        <p className="text-sm font-semibold text-gold">Seu plano mudou</p>
        <span className="flex-1" />
        <button type="button" onClick={onDismiss} aria-label="Dispensar aviso" className="rounded p-1 text-muted hover:text-fg">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <ul className="space-y-1">
        {changes.map((c) => (
          <li key={`${c.side}|${c.other}|${c.type}|${c.tier}`} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            <span className={`text-xs font-bold ${c.delta > 0 ? "text-teal" : "text-red-300"}`}>{c.delta > 0 ? "+" : "−"}</span>
            <span className="text-muted">{c.side === "get" ? "Receber de" : "Entregar para"}</span>
            <b className="font-semibold">{c.other}</b>
            <StoneChip type={c.type} tier={c.tier} qty={Math.abs(c.delta)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Plano ─────────────────────────────────────────────────────────────────────

/** Junta as transferências pela outra pessoa: "→ Ciclano" com todas as stones dele. */
function groupBy(transfers: readonly Transfer[], side: "to" | "from") {
  const groups = new Map<string, Transfer[]>();
  for (const t of transfers) groups.set(t[side], [...(groups.get(t[side]) ?? []), t]);
  return [...groups];
}

function Row({ icon, name, stones, tone, withMe, onMarkDone, busy }: { icon: "give" | "get"; name: string; stones: readonly Transfer[]; tone: string; withMe: boolean; onMarkDone?: (ids: number[], done: boolean) => void; busy: boolean }) {
  const Icon = icon === "give" ? ArrowRight : ArrowLeft;
  const ids = stones.flatMap((t) => (t.id === undefined ? [] : [t.id]));
  const allDone = stones.length > 0 && stones.every((t) => t.done);
  return (
    <li className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${withMe ? "-mx-1.5 rounded-lg bg-gold/10 px-1.5 py-1 ring-1 ring-gold/40" : ""}`}>
      <span className={`inline-flex min-w-0 items-center gap-1 text-sm font-semibold ${tone}`}>
        <Icon className="size-4 shrink-0" aria-hidden /> {withMe ? "você" : name}
      </span>
      <span className="flex flex-wrap gap-1">
        {stones.map((t) => (
          <StoneChip key={t.id ?? `${t.type}:${t.tier}`} type={t.type} tier={t.tier} qty={t.qty} done={t.done} />
        ))}
      </span>
      {onMarkDone && ids.length > 0 ? (
        <button
          type="button"
          onClick={() => onMarkDone(ids, !allDone)}
          disabled={busy}
          aria-pressed={allDone}
          className={`ml-auto inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium disabled:opacity-40 ${allDone ? "border-teal/60 bg-teal/15 text-teal" : "border-line text-muted hover:text-fg"}`}
        >
          <Check className="size-3.5" aria-hidden /> {allDone ? "Trocado" : "Já troquei"}
        </button>
      ) : (
        allDone && <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-teal"><Check className="size-3.5" aria-hidden /> trocado</span>
      )}
    </li>
  );
}

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirando";
  const hours = Math.ceil(ms / 3600_000);
  return hours <= 1 ? "some em menos de 1h" : `some em ${hours}h`;
}

type CardProps = { person: PersonPlan; me: string | null; flash: boolean; expiresAt?: string; onRetract?: () => void; onMarkDone: (ids: number[], done: boolean) => void; busy: boolean };

function PersonCard({ person, me, flash, expiresAt, onRetract, onMarkDone, busy }: CardProps) {
  const mine = person.name === me;
  const empty = person.keeps.length === 0 && person.gives.length === 0 && person.gets.length === 0;
  const [copyLabel, setCopyLabel] = useState("copiar meu plano");
  const partners = new Set([...person.gets.map((t) => t.from), ...person.gives.map((t) => t.to)]).size;

  async function copyMine() {
    try {
      await navigator.clipboard.writeText(personText(person));
      setCopyLabel("copiado!");
    } catch {
      setCopyLabel("não foi possível copiar");
    }
    setTimeout(() => setCopyLabel("copiar meu plano"), 1800);
  }

  return (
    <li className={`rounded-xl border p-3 transition-shadow duration-700 ${mine ? "border-gold/60 bg-gold/5" : "border-line bg-black/20"} ${flash ? "shadow-[0_0_0_2px_var(--color-teal)]" : "shadow-[0_0_0_0_transparent]"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className={`text-base font-semibold ${mine ? "text-gold" : ""}`}>{person.name}</h4>
        {mine && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">você</span>}
        {flash && <span className="rounded-full bg-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">atualizado</span>}
        <span className="text-xs text-muted">
          entrega {person.gives.reduce((n, t) => n + t.qty, 0)} · recebe {person.gets.reduce((n, t) => n + t.qty, 0)}
          {partners > 0 && ` · troca com ${partners} ${partners === 1 ? "pessoa" : "pessoas"}`}
        </span>
        <span className="flex-1" />
        {expiresAt && <span className="text-xs text-muted">{hoursLeft(expiresAt)}</span>}
        {mine && !empty && (
          <button type="button" onClick={() => void copyMine()} className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline">
            {copyLabel}
          </button>
        )}
        {mine && onRetract && (
          <button type="button" onClick={onRetract} disabled={busy} className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-40">
            retirar meu drop
          </button>
        )}
      </div>

      {empty ? (
        <p className="text-sm text-muted">Nada a trocar por enquanto: ninguém que publicou quer o que {mine ? "você dropou" : "caiu"}.</p>
      ) : (
        <div className="space-y-2">
          {person.gets.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal">Recebe</p>
              <ul className="space-y-1.5">
                {groupBy(person.gets, "from").map(([name, list]) => (
                  <Row key={name} icon="get" name={name} stones={list} tone="text-teal" withMe={!mine && name === me} onMarkDone={mine || name === me ? onMarkDone : undefined} busy={busy} />
                ))}
              </ul>
            </div>
          )}
          {person.gives.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">Entrega</p>
              <ul className="space-y-1.5">
                {groupBy(person.gives, "to").map(([name, list]) => (
                  <Row key={name} icon="give" name={name} stones={list} tone="text-gold" withMe={!mine && name === me} onMarkDone={mine || name === me ? onMarkDone : undefined} busy={busy} />
                ))}
              </ul>
            </div>
          )}
          {person.keeps.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                <Hand className="size-3.5" aria-hidden /> Fica com {mine ? "você" : "ele"}
              </p>
              <span className="flex flex-wrap gap-1">
                {person.keeps.map((k) => (
                  <StoneChip key={`${k.type}:${k.tier}`} type={k.type} tier={k.tier} qty={k.qty} />
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/** Quem ainda não publicou, mas quer stones: o plano muda assim que essas pessoas publicarem. */
export function WaitingList({ people }: { people: readonly { name: string; wants: readonly BoostWant[] }[] }) {
  if (people.length === 0) return null;
  return (
    <details className="mt-3 rounded-xl border border-line bg-black/20 p-3">
      <summary className="flex cursor-pointer items-center gap-2 text-sm">
        <Hourglass className="size-4 text-muted" aria-hidden />
        <span className="font-medium">Ainda não publicaram</span>
        <span className="text-xs text-muted">({people.length})</span>
      </summary>
      <p className="mb-2 mt-2 text-xs text-muted">Quando essas pessoas publicarem, o plano se refaz e elas entram nas trocas.</p>
      <ul className="space-y-1.5">
        {people.map((p) => (
          <li key={p.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <b className="font-semibold">{p.name}</b>
            <span className="text-xs text-muted">quer {p.wants.map((w) => typeInfo[w.type].label).join(", ")}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

type ViewProps = {
  plan: Plan;
  me: string | null;
  expiresByName: Map<string, string>;
  flash: ReadonlySet<string>;
  hints: readonly LeftoverHint[];
  onMarkDone: (ids: number[], done: boolean) => void;
  onRetract: () => void;
  busy: boolean;
};

/** O plano da rodada: um cartão por pessoa que publicou (o seu primeiro) e o que sobrou, com quem ainda pode resolver. */
export function TradePlanView({ plan, me, expiresByName, flash, hints, onMarkDone, onRetract, busy }: ViewProps) {
  const people = [...plan.people].sort((a, b) => Number(b.name === me) - Number(a.name === me));
  return (
    <>
      <ul className="space-y-2.5">
        {people.map((p) => (
          <PersonCard key={p.name} person={p} me={me} flash={flash.has(p.name)} expiresAt={expiresByName.get(p.name)} onRetract={p.name === me ? onRetract : undefined} onMarkDone={onMarkDone} busy={busy} />
        ))}
      </ul>
      {hints.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-line p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Sobrou — ninguém que publicou quer</p>
          <ul className="space-y-2">
            {hints.map((l) => (
              <li key={`${l.owner}:${l.type}:${l.tier}`} className="text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StoneChip type={l.type} tier={l.tier} qty={l.qty} /> <span className="text-xs text-muted">de {l.owner}</span>
                </div>
                {l.waiting.length > 0 && (
                  <p className="mt-1 text-xs text-teal">
                    {l.waiting.join(", ")} {l.waiting.length === 1 ? "quer" : "querem"} e ainda não {l.waiting.length === 1 ? "publicou" : "publicaram"}: vai entrar sozinha quando publicar{l.waiting.length === 1 ? "" : "em"}.
                  </p>
                )}
                {l.otherTier.length > 0 && (
                  <p className="mt-1 text-xs text-muted">
                    {l.otherTier.join(", ")} {l.otherTier.length === 1 ? "quer" : "querem"} {typeInfo[l.type].label}, mas em outro nível: dá para combinar por fora.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
