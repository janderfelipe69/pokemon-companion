import { isZone, type DropItem, type DropRow } from "@/lib/drops/types";
import { createPublicClient } from "./client";

export type RawDrops = { items: DropItem[]; drops: DropRow[]; status: "ok" | "unconfigured" | "error" };

type ItemRow = { id: number; name: string; image_path: string | null };
type DropDbRow = {
  pokemon_id: string;
  item_id: number;
  zone: string;
  quantity_min: number | null;
  quantity_max: number | null;
  chance: number | string | null;
  very_rare: boolean;
};

/** Itens e drops do banco. Se o Supabase não estiver configurado (ou o SQL ainda não rodou), devolve tudo vazio. */
export async function getDropsRaw(): Promise<RawDrops> {
  const client = createPublicClient();
  if (!client) return { items: [], drops: [], status: "unconfigured" };

  try {
    const [items, drops] = await Promise.all([
      client.from("talent_items").select("id, name, image_path").order("name", { ascending: true }),
      client
        .from("pokemon_talent_drops")
        .select("pokemon_id, item_id, zone, quantity_min, quantity_max, chance, very_rare")
        .order("id", { ascending: true }),
    ]);
    if (items.error) throw new Error(items.error.message);
    if (drops.error) throw new Error(drops.error.message);

    return {
      status: "ok",
      items: ((items.data ?? []) as ItemRow[]).map((r) => ({ id: r.id, name: r.name, imagePath: r.image_path })),
      drops: ((drops.data ?? []) as DropDbRow[]).flatMap((r) =>
        isZone(r.zone)
          ? [
              {
                pokemonId: r.pokemon_id,
                itemId: r.item_id,
                zone: r.zone,
                min: r.quantity_min,
                max: r.quantity_max,
                chance: r.chance == null ? null : Number(r.chance),
                veryRare: r.very_rare,
              },
            ]
          : [],
      ),
    };
  } catch (error) {
    console.warn("[drops] Não foi possível ler os drops do banco.", error);
    return { items: [], drops: [], status: "error" };
  }
}
