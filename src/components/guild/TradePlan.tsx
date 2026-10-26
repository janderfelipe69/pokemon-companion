"use client";

import { ArrowLeft, ArrowRight, Hand } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { STONE_TIERS, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { LeftoverStone, PersonPlan, Transfer, TradePlan as Plan } from "@/lib/guild/boostTrades";
import type { PokemonType } from "@/types/pokemon";

/** Uma stone com ícone do tipo e a cor dele: "2x Advanced Fire". */
export function StoneChip({ type, tier, qty }: { type: PokemonType; tier: StoneTierKey; qty: number }) {
  const { label, color } = typeInfo[type];
  const tierLabel = STONE_TIERS.find((t) => t.key === tier)?.label ?? tier;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: `${color}99`, backgroundColor: `${color}22` }}>
      <TypeIcon type={type} className="size-4" />
      {qty}x {tierLabel} {label}
    </span>
  );
}

/** Junta as transferências pela outra pessoa: "→ Ciclano" com todas as stones dele. */
function groupBy(transfers: readonly Transfer[], side: "to" | "from") {
  const groups = new Map<string, Transfer[]>();
  for (const t of transfers) groups.set(t[side], [...(groups.get(t[side]) ?? []), t]);
  return [...groups];
}

function Row({ icon, name, stones, tone }: { icon: "give" | "get"; name: string; stones: readonly Transfer[]; tone: string }) {
  const Icon = icon === "give" ? ArrowRight : ArrowLeft;
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={`inline-flex min-w-0 items-center gap-1 text-sm font-semibold ${tone}`}>
        <Icon className="size-4 shrink-0" aria-hidden /> {name}
      </span>
      <span className="flex flex-wrap gap-1">
        {stones.map((t) => (
          <StoneChip key={`${t.type}:${t.tier}`} type={t.type} tier={t.tier} qty={t.qty} />
        ))}
      </span>
    </li>
  );
}

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirando";
  const hours = Math.ceil(ms / 3600_000);
  return hours <= 1 ? "some em menos de 1h" : `some em ${hours}h`;
}

function PersonCard({ person, mine, expiresAt, onRetract, busy }: { person: PersonPlan; mine: boolean; expiresAt?: string; onRetract?: () => void; busy: boolean }) {
  const empty = person.keeps.length === 0 && person.gives.length === 0 && person.gets.length === 0;
  return (
    <li className={`rounded-xl border p-3 ${mine ? "border-gold/60 bg-gold/5" : "border-line bg-black/20"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className={`text-base font-semibold ${mine ? "text-gold" : ""}`}>{person.name}</h4>
        {mine && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">você</span>}
        <span className="text-xs text-muted">
          entrega {person.gives.reduce((n, t) => n + t.qty, 0)} · recebe {person.gets.reduce((n, t) => n + t.qty, 0)}
        </span>
        <span className="flex-1" />
        {expiresAt && <span className="text-xs text-muted">{hoursLeft(expiresAt)}</span>}
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
              <ul className="space-y-1.5">{groupBy(person.gets, "from").map(([name, list]) => <Row key={name} icon="get" name={name} stones={list} tone="text-teal" />)}</ul>
            </div>
          )}
          {person.gives.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gold">Entrega</p>
              <ul className="space-y-1.5">{groupBy(person.gives, "to").map(([name, list]) => <Row key={name} icon="give" name={name} stones={list} tone="text-gold" />)}</ul>
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

/** O plano da rodada: um cartão por pessoa que publicou (o seu primeiro) e o que sobrou. */
export function TradePlanView({ plan, me, expiresByName, onRetract, busy }: { plan: Plan; me: string | null; expiresByName: Map<string, string>; onRetract: () => void; busy: boolean }) {
  const people = [...plan.people].sort((a, b) => Number(b.name === me) - Number(a.name === me));
  const leftover: LeftoverStone[] = plan.leftover;
  return (
    <>
      <ul className="space-y-2.5">
        {people.map((p) => (
          <PersonCard key={p.name} person={p} mine={p.name === me} expiresAt={expiresByName.get(p.name)} onRetract={p.name === me ? onRetract : undefined} busy={busy} />
        ))}
      </ul>
      {leftover.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-line p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Sobrou — ninguém que publicou quer</p>
          <ul className="space-y-1.5">
            {leftover.map((l) => (
              <li key={`${l.owner}:${l.type}:${l.tier}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <StoneChip type={l.type} tier={l.tier} qty={l.qty} /> <span className="text-xs text-muted">de {l.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
