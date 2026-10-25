/** Zonas em que um Pokémon pode dropar (as abas Base / Wildscape / Primal do jogo). */
export const ZONES = [
  { key: "base", label: "Base" },
  { key: "wildscape", label: "Wildscape" },
  { key: "primal", label: "Primal" },
] as const;

export type ZoneKey = (typeof ZONES)[number]["key"];

export const isZone = (value: unknown): value is ZoneKey => ZONES.some((z) => z.key === value);
export const zoneLabel = (zone: ZoneKey) => ZONES.find((z) => z.key === zone)?.label ?? zone;
const zoneOrder = (zone: ZoneKey) => ZONES.findIndex((z) => z.key === zone);

export const MAX_DROPS_PER_POKEMON = 60;
export const MAX_DROP_QUANTITY = 999_999;

/** Um item que um Pokémon dropa, em uma zona. `chance` vazia e `veryRare` falso = chance não informada. */
export type DropRow = {
  pokemonId: string;
  itemId: number;
  zone: ZoneKey;
  min: number | null;
  max: number | null;
  chance: number | null;
  veryRare: boolean;
};

export type DropItem = { id: number; name: string; imagePath: string | null };
export type DropPokemon = { id: string; name: string; image: string | null; dexNumber: number | null };

/** Tudo que a tela precisa para navegar entre itens e Pokémon. */
export type DropsClientData = { items: DropItem[]; pokemon: DropPokemon[]; drops: DropRow[] };

/** Para onde a janela de drops está olhando: um item (quem dropa) ou um Pokémon (o que dropa). */
export type DropsView = { kind: "item"; id: number } | { kind: "pokemon"; id: string };

/** "80.0%", "24.5%", "0.25%". */
export function formatChance(chance: number): string {
  return `${chance.toFixed(2).replace(/0$/, "")}%`;
}

/** "8-10" (como no jogo); sem dado, `null`. */
export function formatQuantity(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const low = min ?? max;
  const high = max ?? min;
  return `${low}-${high}`;
}

export type DropsIndex = {
  itemsById: Map<number, DropItem>;
  pokemonById: Map<string, DropPokemon>;
  byPokemon: Map<string, DropRow[]>;
  byItem: Map<number, DropRow[]>;
};

/** Organiza os drops por Pokémon e por item. Dentro de cada lista: zona, depois maior chance primeiro. */
export function indexDrops(data: DropsClientData): DropsIndex {
  const byPokemon = new Map<string, DropRow[]>();
  const byItem = new Map<number, DropRow[]>();
  const push = <K,>(map: Map<K, DropRow[]>, key: K, row: DropRow) => {
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  };
  for (const row of data.drops) {
    push(byPokemon, row.pokemonId, row);
    push(byItem, row.itemId, row);
  }
  const order = (a: DropRow, b: DropRow) =>
    zoneOrder(a.zone) - zoneOrder(b.zone) || (b.chance ?? (b.veryRare ? 0 : -1)) - (a.chance ?? (a.veryRare ? 0 : -1));
  for (const list of byPokemon.values()) list.sort(order);
  for (const list of byItem.values()) list.sort(order);

  return {
    itemsById: new Map(data.items.map((i) => [i.id, i])),
    pokemonById: new Map(data.pokemon.map((p) => [p.id, p])),
    byPokemon,
    byItem,
  };
}
