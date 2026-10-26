import { isBoostType, isTierKey, MAX_STONE_QTY, sortDrops, type BoostWant, type DropStone } from "@/config/guildBoost";

/** Uma linha do log de drops: "3 Advanced Fire Stones. You can boost ... +26 and +30 boosts ... (12%)". */
export type Stone = { qty: number; tier: string; type: string; typeKey: string; min: number; max: number; chance: number };

export type PersonWants = { name: string; wants: BoostWant[] };
/** Uma stone do log com os nomes de quem quer ESSE nível desse tipo. */
export type StoneWithNames = Stone & { names: string[] };
export type TypeGroup = { type: string; typeKey: string; stones: StoneWithNames[]; names: string[] };

// Mesmo padrão do organizador antigo (HTML), só aceitando também chance com casas decimais ("12,5%").
const STONE_RE = /(\d+)\s+([A-Za-z]+)\s+([A-Za-z]+)\s+Stones?\.?\s*You can boost[^+]*\+(\d+)\s+and\s+\+(\d+)\s+boosts[^(]*\((\d+(?:[.,]\d+)?)%/gi;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

/** Lê o log colado e devolve as stones, as mais fortes primeiro. */
export function parseStones(text: string): Stone[] {
  const out: Stone[] = [];
  for (const m of text.matchAll(STONE_RE)) {
    const type = capitalize(m[3]);
    out.push({ qty: Number(m[1]), tier: capitalize(m[2]), type, typeKey: type.toLowerCase(), min: Number(m[4]), max: Number(m[5]), chance: Number(m[6].replace(",", ".")) });
  }
  return out.sort((a, b) => b.min - a.min);
}

/** Quem quer essa stone: tem o tipo e o nível dela marcados. Nível desconhecido no log: vale quem quer o tipo (melhor avisar a mais do que esquecer alguém). */
function wantsStone(person: PersonWants, stone: Stone): boolean {
  const want = person.wants.find((w) => w.type === stone.typeKey);
  if (!want) return false;
  const tier = stone.tier.toLowerCase();
  return !isTierKey(tier) || want.tiers.includes(tier);
}

/** Agrupa por tipo e, em cada stone, junta os nomes de quem a quer. Tipos com mais interessados primeiro. */
export function groupByType(stones: Stone[], people: readonly PersonWants[]): TypeGroup[] {
  const groups = new Map<string, TypeGroup>();
  for (const stone of stones) {
    const group = groups.get(stone.typeKey) ?? { type: stone.type, typeKey: stone.typeKey, stones: [], names: [] };
    group.stones.push({ ...stone, names: people.filter((p) => wantsStone(p, stone)).map((p) => p.name) });
    groups.set(stone.typeKey, group);
  }
  for (const group of groups.values()) group.names = [...new Set(group.stones.flatMap((s) => s.names))];
  return [...groups.values()].sort((a, b) => b.names.length - a.names.length || a.type.localeCompare(b.type));
}

const stoneLine = (s: StoneWithNames) => `  ${s.qty}x ${s.tier} | +${s.min}~+${s.max} | ${s.chance}%\n    Precisam: ${s.names.join(", ") || "ninguém"}`;

/** Resumo em texto para copiar e colar no chat da guilda. */
export function summaryText(groups: readonly TypeGroup[]): string {
  return groups.map((g) => `${g.type.toUpperCase()}\n${g.stones.map(stoneLine).join("\n")}`).join("\n\n");
}

/** Transforma as stones do log nos drops que vão ser publicados (soma linhas repetidas). `skipped` = linhas com tipo/nível desconhecido. */
export function stonesToDrops(stones: readonly Stone[]): { drops: DropStone[]; skipped: number } {
  const sums = new Map<string, DropStone>();
  let skipped = 0;
  for (const stone of stones) {
    const tier = stone.tier.toLowerCase();
    if (!isBoostType(stone.typeKey) || !isTierKey(tier)) {
      skipped++;
      continue;
    }
    const key = `${stone.typeKey}:${tier}`;
    const current = sums.get(key) ?? { type: stone.typeKey, tier, qty: 0 };
    current.qty = Math.min(MAX_STONE_QTY, current.qty + stone.qty);
    sums.set(key, current);
  }
  return { drops: sortDrops([...sums.values()]), skipped };
}
