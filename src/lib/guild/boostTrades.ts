import { BOOST_TYPES, STONE_TIERS, TIER_KEYS, type BoostWant, type DropStone, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

/** Quem publicou drop nesta rodada: o que tem e o que quer receber. */
export type Participant = { name: string; stones: DropStone[]; wants: BoostWant[] };
export type Transfer = { from: string; to: string; type: PokemonType; tier: StoneTierKey; qty: number };
export type PersonPlan = { name: string; keeps: DropStone[]; gives: Transfer[]; gets: Transfer[] };
export type LeftoverStone = { owner: string; type: PokemonType; tier: StoneTierKey; qty: number };
export type TradePlan = { people: PersonPlan[]; transfers: Transfer[]; leftover: LeftoverStone[] };

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR");
const key = (type: PokemonType, tier: StoneTierKey) => `${type}:${tier}`;

/**
 * Distribui as stones entre quem publicou. É determinístico (todo mundo vê o mesmo plano) e segue 3 regras:
 *  1. Quem dropou uma stone que ele mesmo quer, fica com ela.
 *  2. O resto vai para quem quer aquele tipo e nível, sempre para quem tem MENOS stones até agora (divide por igual).
 *  3. As mais fortes são distribuídas primeiro. Se ninguém quer, a stone entra em `leftover`.
 * Só entra no plano quem publicou: quem não publicou não recebe nem entrega nada.
 */
export function planTrades(participants: readonly Participant[]): TradePlan {
  const people = [...participants].sort((a, b) => byName(a.name, b.name));
  const wantMap = new Map(people.map((p) => [p.name, new Map(p.wants.map((w) => [w.type, new Set<StoneTierKey>(w.tiers)]))]));
  const wants = (name: string, type: PokemonType, tier: StoneTierKey) => wantMap.get(name)?.get(type)?.has(tier) ?? false;

  const holdings = new Map(people.map((p) => [p.name, 0]));
  const keeps = new Map(people.map((p) => [p.name, new Map<string, DropStone>()]));
  const transfers = new Map<string, Transfer>();
  const leftover: LeftoverStone[] = [];

  const addKeep = (name: string, type: PokemonType, tier: StoneTierKey, qty: number) => {
    const mine = keeps.get(name)!;
    const current = mine.get(key(type, tier)) ?? { type, tier, qty: 0 };
    current.qty += qty;
    mine.set(key(type, tier), current);
    holdings.set(name, holdings.get(name)! + qty);
  };

  // Regra 1: cada um fica com o que dropou e quer.
  const toGive: { owner: string; stone: DropStone }[] = [];
  for (const p of people) {
    for (const stone of p.stones) {
      if (wants(p.name, stone.type, stone.tier)) addKeep(p.name, stone.type, stone.tier, stone.qty);
      else toGive.push({ owner: p.name, stone });
    }
  }

  // Regra 3: mais fortes primeiro (depois tipo e dono, só para a ordem ser sempre a mesma).
  toGive.sort(
    (a, b) =>
      TIER_KEYS.indexOf(b.stone.tier) - TIER_KEYS.indexOf(a.stone.tier) ||
      BOOST_TYPES.indexOf(a.stone.type) - BOOST_TYPES.indexOf(b.stone.type) ||
      byName(a.owner, b.owner),
  );

  // Regra 2: uma stone por vez, para quem quer e está com menos.
  for (const { owner, stone } of toGive) {
    for (let given = 0; given < stone.qty; given++) {
      const candidates = people.filter((p) => p.name !== owner && wants(p.name, stone.type, stone.tier));
      if (candidates.length === 0) {
        leftover.push({ owner, type: stone.type, tier: stone.tier, qty: stone.qty - given });
        break;
      }
      const receiver = candidates.reduce((best, c) => (holdings.get(c.name)! < holdings.get(best.name)! ? c : best)).name;
      holdings.set(receiver, holdings.get(receiver)! + 1);
      const id = `${owner}|${receiver}|${key(stone.type, stone.tier)}`;
      const current = transfers.get(id) ?? { from: owner, to: receiver, type: stone.type, tier: stone.tier, qty: 0 };
      current.qty += 1;
      transfers.set(id, current);
    }
  }

  const order = (t: { type: PokemonType; tier: StoneTierKey }) => BOOST_TYPES.indexOf(t.type) * 10 + TIER_KEYS.indexOf(t.tier);
  const all = [...transfers.values()].sort((a, b) => byName(a.from, b.from) || byName(a.to, b.to) || order(a) - order(b));

  return {
    people: people.map((p) => ({
      name: p.name,
      keeps: [...keeps.get(p.name)!.values()].sort((a, b) => order(a) - order(b)),
      gives: all.filter((t) => t.from === p.name),
      gets: all.filter((t) => t.to === p.name),
    })),
    transfers: all,
    leftover: leftover.sort((a, b) => byName(a.owner, b.owner) || order(a) - order(b)),
  };
}

const tierLabel = (tier: StoneTierKey) => STONE_TIERS.find((t) => t.key === tier)?.label ?? tier;
export const stoneLabel = (s: { type: PokemonType; tier: StoneTierKey; qty: number }) => `${s.qty}x ${tierLabel(s.tier)} ${typeInfo[s.type].label}`;

/** O plano em texto para colar no chat da guilda: quem entrega o quê para quem. */
export function planText(plan: TradePlan): string {
  const givers = plan.people.filter((p) => p.gives.length > 0);
  if (givers.length === 0) return "Nenhuma troca por enquanto.";
  const lines = givers.map((p) => `${p.name} entrega:\n${p.gives.map((t) => `  → ${t.to}: ${stoneLabel(t)}`).join("\n")}`);
  const rest = plan.leftover.length > 0 ? `\n\nSobrou (ninguém quer): ${plan.leftover.map((l) => `${stoneLabel(l)} de ${l.owner}`).join(", ")}` : "";
  return lines.join("\n\n") + rest;
}
