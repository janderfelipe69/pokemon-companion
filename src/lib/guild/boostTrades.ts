import { BOOST_TYPES, STONE_TIERS, TIER_KEYS, type BoostWant, type DropStone, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

/** Quem publicou drop nesta rodada: o que tem e o que quer receber. */
export type Participant = { name: string; stones: DropStone[]; wants: BoostWant[] };
/** Uma troca: `from` entrega a `to` TODAS as `qty` stones desse tipo e nível. `id` e `done` vêm do banco. */
export type Transfer = { from: string; to: string; type: PokemonType; tier: StoneTierKey; qty: number; id?: number; done?: boolean };
export type StoredTransfer = Transfer & { id: number; done: boolean };
export type PersonPlan = { name: string; keeps: DropStone[]; gives: Transfer[]; gets: Transfer[]; /** Quantas stones a pessoa tem no fim (as que ficam + as que recebe). */ total: number };
export type LeftoverStone = { owner: string; type: PokemonType; tier: StoneTierKey; qty: number };
export type TradePlan = { people: PersonPlan[]; transfers: Transfer[]; leftover: LeftoverStone[] };

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR");
const key = (type: PokemonType, tier: StoneTierKey) => `${type}:${tier}`;
const order = (t: { type: PokemonType; tier: StoneTierKey }) => BOOST_TYPES.indexOf(t.type) * 10 + TIER_KEYS.indexOf(t.tier);

/** Peso de uma stone: o meio da faixa de boost dela (Novice ≈ 3, Advanced ≈ 28). Só serve para decidir quem está com menos. */
const power = (tier: StoneTierKey) => {
  const t = STONE_TIERS.find((s) => s.key === tier)!;
  return (t.min + t.max) / 2;
};

const wantsStone = (p: Participant | undefined, type: PokemonType, tier: StoneTierKey) => p?.wants.some((w) => w.type === type && w.tiers.includes(tier)) ?? false;

/**
 * Decide o que mudar nas trocas guardadas quando alguém publica, retira ou muda o que quer.
 * As trocas que já existem NÃO são refeitas nem divididas de novo: só ganham coisas novas. As regras:
 *  1. Quem dropou uma stone que ele mesmo quer, fica com ela.
 *  2. Cada stone sem dono vai INTEIRA para uma única pessoa que a quer (a que está com menos poder até agora).
 *     As mais fortes primeiro; entre iguais, as que menos gente quer vão antes.
 *  3. Troca já marcada como feita nunca sai. Troca ainda não feita só sai se deixou de fazer sentido
 *     (o dono retirou o drop, o destino não quer mais ou a stone passou da quantidade publicada).
 *  4. Se ninguém quer, a stone fica como "sobrou" e é entregue a quem publicar depois e a quiser.
 */
export function reconcileTransfers(participants: readonly Participant[], existing: readonly StoredTransfer[]): { remove: number[]; add: Transfer[] } {
  const people = new Map(participants.map((p) => [p.name, p]));
  const groups = new Map<string, { owner: string; type: PokemonType; tier: StoneTierKey; qty: number }>();
  for (const p of participants) for (const s of p.stones) groups.set(`${p.name}|${key(s.type, s.tier)}`, { owner: p.name, type: s.type, tier: s.tier, qty: s.qty });

  const used = new Map<string, number>(); // quanto de cada stone já tem destino
  const gained = new Map(participants.map((p) => [p.name, 0])); // poder que cada um já tem (fica + recebe)
  const gain = (name: string, tier: StoneTierKey, qty: number) => gained.has(name) && gained.set(name, gained.get(name)! + qty * power(tier));
  const remove: number[] = [];
  const sorted = [...existing].sort((a, b) => a.id - b.id);

  // Feitas: nunca saem e já contam.
  for (const t of sorted.filter((x) => x.done)) {
    const k = `${t.from}|${key(t.type, t.tier)}`;
    used.set(k, (used.get(k) ?? 0) + t.qty);
    gain(t.to, t.tier, t.qty);
  }
  // Ainda não feitas: ficam se ainda fazem sentido.
  for (const t of sorted.filter((x) => !x.done)) {
    const k = `${t.from}|${key(t.type, t.tier)}`;
    const group = groups.get(k);
    const valid = group && !wantsStone(people.get(t.from), t.type, t.tier) && people.has(t.to) && wantsStone(people.get(t.to), t.type, t.tier) && (used.get(k) ?? 0) + t.qty <= group.qty;
    if (!valid) {
      remove.push(t.id);
      continue;
    }
    used.set(k, (used.get(k) ?? 0) + t.qty);
    gain(t.to, t.tier, t.qty);
  }
  // Quem fica com o que dropou e quer.
  for (const g of groups.values()) if (wantsStone(people.get(g.owner), g.type, g.tier)) gain(g.owner, g.tier, g.qty - (used.get(`${g.owner}|${key(g.type, g.tier)}`) ?? 0));

  // Stones sem destino: cada uma vai inteira para uma pessoa.
  const pending = [...groups.values()]
    .filter((g) => !wantsStone(people.get(g.owner), g.type, g.tier) && g.qty - (used.get(`${g.owner}|${key(g.type, g.tier)}`) ?? 0) > 0)
    .map((g) => ({ ...g, left: g.qty - (used.get(`${g.owner}|${key(g.type, g.tier)}`) ?? 0), options: participants.filter((p) => p.name !== g.owner && wantsStone(p, g.type, g.tier)).length }));
  pending.sort((a, b) => TIER_KEYS.indexOf(b.tier) - TIER_KEYS.indexOf(a.tier) || a.options - b.options || BOOST_TYPES.indexOf(a.type) - BOOST_TYPES.indexOf(b.type) || byName(a.owner, b.owner));

  const add: Transfer[] = [];
  for (const g of pending) {
    const candidates = participants.filter((p) => p.name !== g.owner && wantsStone(p, g.type, g.tier)).sort((a, b) => byName(a.name, b.name));
    if (candidates.length === 0) continue;
    const receiver = candidates.reduce((best, c) => (gained.get(c.name)! < gained.get(best.name)! ? c : best)).name;
    gain(receiver, g.tier, g.left);
    add.push({ from: g.owner, to: receiver, type: g.type, tier: g.tier, qty: g.left });
  }
  return { remove, add };
}

/** Monta o plano para mostrar: as trocas guardadas, o que cada um mantém e o que sobrou sem destino. */
export function buildPlan(participants: readonly Participant[], stored: readonly Transfer[]): TradePlan {
  const names = new Set([...participants.map((p) => p.name), ...stored.flatMap((t) => [t.from, t.to])]);
  const transfers = [...stored].sort((a, b) => byName(a.from, b.from) || byName(a.to, b.to) || order(a) - order(b));
  const assigned = (owner: string, type: PokemonType, tier: StoneTierKey) => transfers.filter((t) => t.from === owner && t.type === type && t.tier === tier).reduce((n, t) => n + t.qty, 0);

  const keeps = new Map<string, DropStone[]>();
  const leftover: LeftoverStone[] = [];
  for (const p of participants) {
    for (const s of p.stones) {
      const rest = s.qty - assigned(p.name, s.type, s.tier);
      if (rest <= 0) continue;
      if (wantsStone(p, s.type, s.tier)) keeps.set(p.name, [...(keeps.get(p.name) ?? []), { type: s.type, tier: s.tier, qty: rest }]);
      else leftover.push({ owner: p.name, type: s.type, tier: s.tier, qty: rest });
    }
  }
  const people = [...names].sort(byName).map((name) => {
    const mine = (keeps.get(name) ?? []).sort((a, b) => order(a) - order(b));
    const gets = transfers.filter((t) => t.to === name);
    return { name, keeps: mine, gives: transfers.filter((t) => t.from === name), gets, total: mine.reduce((n, k) => n + k.qty, 0) + gets.reduce((n, t) => n + t.qty, 0) };
  });
  return { people, transfers, leftover: leftover.sort((a, b) => byName(a.owner, b.owner) || order(a) - order(b)) };
}

// ── O que mudou e o que ainda falta ───────────────────────────────────────────

/** Uma linha do plano de uma pessoa que mudou entre duas versões: `delta` > 0 = passou a ter mais, < 0 = perdeu. */
export type PlanChange = { side: "get" | "give"; other: string; type: PokemonType; tier: StoneTierKey; delta: number };

/** Compara o plano antigo com o novo só do ponto de vista de `name`: o que ele passa a receber/entregar e o que sumiu. */
export function planChanges(prev: TradePlan | null, next: TradePlan, name: string): PlanChange[] {
  if (!prev) return [];
  const flat = (plan: TradePlan) => {
    const map = new Map<string, PlanChange>();
    for (const t of plan.transfers) {
      const side = t.to === name ? "get" : t.from === name ? "give" : null;
      if (!side) continue;
      const other = side === "get" ? t.from : t.to;
      map.set(`${side}|${other}|${key(t.type, t.tier)}`, { side, other, type: t.type, tier: t.tier, delta: t.qty });
    }
    return map;
  };
  const before = flat(prev);
  const after = flat(next);
  const out: PlanChange[] = [];
  for (const [id, now] of after) {
    const delta = now.delta - (before.get(id)?.delta ?? 0);
    if (delta !== 0) out.push({ ...now, delta });
  }
  for (const [id, old] of before) if (!after.has(id)) out.push({ ...old, delta: -old.delta });
  return out;
}

/** Nomes das pessoas cujo cartão mudou entre duas versões do plano (para destacar na tela). */
export function changedPeople(prev: TradePlan | null, next: TradePlan): Set<string> {
  const changed = new Set<string>();
  if (!prev) return changed;
  const sig = (p: PersonPlan) => JSON.stringify([p.keeps, p.gives, p.gets]);
  const before = new Map(prev.people.map((p) => [p.name, sig(p)]));
  for (const p of next.people) if (before.get(p.name) !== sig(p)) changed.add(p.name);
  return changed;
}

export const planSignature = (plan: TradePlan) => JSON.stringify([plan.people.map((p) => [p.name, p.keeps]), plan.transfers, plan.leftover]);

/** Quem ainda poderia ficar com uma stone que sobrou. */
export type LeftoverHint = { owner: string; type: PokemonType; tier: StoneTierKey; qty: number; waiting: string[]; otherTier: string[] };

/**
 * Para cada stone que sobrou, diz quem ainda pode resolver:
 *  - `waiting`: quem quer exatamente essa stone mas AINDA NÃO publicou (quando publicar, ela entra no plano);
 *  - `otherTier`: quem publicou e quer esse tipo, só que em outro nível (dá para combinar por fora).
 */
export function leftoverHints(plan: TradePlan, everyone: readonly { name: string; wants: readonly BoostWant[] }[], published: ReadonlySet<string>): LeftoverHint[] {
  return plan.leftover.map((l) => {
    const interested = everyone.filter((p) => p.name !== l.owner && p.wants.some((w) => w.type === l.type));
    const exact = (p: { wants: readonly BoostWant[] }) => p.wants.some((w) => w.type === l.type && w.tiers.includes(l.tier));
    return {
      ...l,
      waiting: interested.filter((p) => !published.has(p.name) && exact(p)).map((p) => p.name),
      otherTier: interested.filter((p) => published.has(p.name) && !exact(p)).map((p) => p.name),
    };
  });
}

const tierLabel = (tier: StoneTierKey) => STONE_TIERS.find((t) => t.key === tier)?.label ?? tier;
export const stoneLabel = (s: { type: PokemonType; tier: StoneTierKey; qty: number; done?: boolean }) => (s.done ? "✓ " : "") + `${s.qty}x ${tierLabel(s.tier)} ${typeInfo[s.type].label}`;

/** O plano em texto para colar no chat da guilda: quem entrega o quê para quem. */
export function planText(plan: TradePlan): string {
  const givers = plan.people.filter((p) => p.gives.length > 0);
  if (givers.length === 0) return "Nenhuma troca por enquanto.";
  const lines = givers.map((p) => `${p.name} entrega:\n${p.gives.map((t) => `  → ${t.to}: ${stoneLabel(t)}`).join("\n")}`);
  const rest = plan.leftover.length > 0 ? `\n\nSobrou (ninguém quer): ${plan.leftover.map((l) => `${stoneLabel(l)} de ${l.owner}`).join(", ")}` : "";
  return lines.join("\n\n") + rest;
}

/** Só a parte de uma pessoa, para ela copiar e mandar no privado. */
export function personText(person: PersonPlan): string {
  const group = (list: readonly Transfer[], side: "to" | "from") => {
    const names = [...new Set(list.map((t) => t[side]))];
    return names.map((n) => `  ${side === "to" ? "→" : "←"} ${n}: ${list.filter((t) => t[side] === n).map(stoneLabel).join(", ")}`);
  };
  const lines = [`Plano de ${person.name}:`];
  if (person.gets.length > 0) lines.push("Recebo:", ...group(person.gets, "from"));
  if (person.gives.length > 0) lines.push("Entrego:", ...group(person.gives, "to"));
  if (person.keeps.length > 0) lines.push(`Fico com: ${person.keeps.map(stoneLabel).join(", ")}`);
  if (lines.length === 1) lines.push("Nada a trocar por enquanto.");
  return lines.join("\n");
}
