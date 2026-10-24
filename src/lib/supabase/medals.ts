import { STATIC_MEDALS, type Medal } from "@/data/medals";
import { createPublicClient } from "./client";

export type MedalsResult = { medals: Medal[]; source: "supabase" | "static" };

export type MedalRow = {
  id: number;
  name: string;
  sprite_id: number | null;
  plus_stat: string;
  plus_value: string | null;
  minus_stat: string | null;
  minus_value: string | null;
};

export const MEDAL_SELECT = "id, name, sprite_id, plus_stat, plus_value::text, minus_stat, minus_value::text";

const toNumber = (value: string | number | null | undefined) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export function mapMedalRow(row: MedalRow): Medal {
  return {
    id: row.id,
    name: row.name,
    spriteId: row.sprite_id ?? row.id,
    plus: row.plus_stat,
    plusValue: toNumber(row.plus_value),
    minus: row.minus_stat,
    minusValue: row.minus_stat ? toNumber(row.minus_value) : null,
  };
}

/** Medalhas do banco; se o Supabase não estiver configurado (ou a tabela ainda não existir), usa a lista de reserva. */
export async function getMedals(): Promise<MedalsResult> {
  const client = createPublicClient();
  if (!client) return { medals: STATIC_MEDALS, source: "static" };

  try {
    const { data, error } = await client.from("medals").select(MEDAL_SELECT).order("id", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as MedalRow[];
    if (rows.length === 0) return { medals: STATIC_MEDALS, source: "static" };
    return { medals: rows.map(mapMedalRow), source: "supabase" };
  } catch (error) {
    console.warn("[medals] Não foi possível ler as medalhas do banco; usando a lista de reserva.", error);
    return { medals: STATIC_MEDALS, source: "static" };
  }
}
