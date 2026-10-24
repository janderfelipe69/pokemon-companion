import { TALENT_CATEGORIES, type TalentCategory } from "@/config/talents";
import { createPublicClient } from "./client";

export type PublicRequirement = { quantity: number; item: { id: number; name: string; imagePath: string | null } };
export type PublicTalent = { id: number; description: string; requirements: PublicRequirement[] };
export type PublicTalentCategory = TalentCategory & { talents: PublicTalent[] };

export type TalentsResult = {
  categories: PublicTalentCategory[];
  status: "ok" | "unconfigured" | "error";
};

type Row = {
  id: number;
  category: string;
  position: number;
  description: string;
  talent_requirements: {
    quantity: number;
    position: number;
    talent_items: { id: number; name: string; image_path: string | null } | null;
  }[];
};

const empty = (status: TalentsResult["status"]): TalentsResult => ({
  categories: TALENT_CATEGORIES.map((c) => ({ ...c, talents: [] })),
  status,
});

/** Talentos e itens do banco. Se o Supabase não estiver configurado (ou o SQL ainda não rodou), devolve tudo vazio. */
export async function getTalents(): Promise<TalentsResult> {
  const client = createPublicClient();
  if (!client) return empty("unconfigured");

  try {
    const { data, error } = await client
      .from("talents")
      .select("id, category, position, description, talent_requirements(quantity, position, talent_items(id, name, image_path))")
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Row[];
    const categories = TALENT_CATEGORIES.map((category) => ({
      ...category,
      talents: rows
        .filter((r) => r.category === category.key)
        .map((r) => ({
          id: r.id,
          description: r.description,
          requirements: [...r.talent_requirements]
            .sort((a, b) => a.position - b.position)
            .flatMap((q) =>
              q.talent_items ? [{ quantity: q.quantity, item: { id: q.talent_items.id, name: q.talent_items.name, imagePath: q.talent_items.image_path } }] : [],
            ),
        })),
    }));
    return { categories, status: "ok" };
  } catch (error) {
    console.warn("[talents] Não foi possível ler os talentos do banco.", error);
    return empty("error");
  }
}
