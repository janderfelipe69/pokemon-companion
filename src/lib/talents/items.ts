/** Pasta (bucket) do Supabase Storage onde ficam as imagens dos itens. */
export const ITEM_BUCKET = "talent-items";

export type TalentItem = { id: number; name: string; imagePath: string | null };
export type TalentItemWithUses = TalentItem & { uses: number };
export type TalentRequirement = { itemId: number; quantity: number };
export type TalentEntry = { id: number | null; description: string; requirements: TalentRequirement[] };

/** Endereço público da imagem de um item (ou `null` se ele ainda não tem imagem). */
export function itemImageUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  return base && path ? `${base}/storage/v1/object/public/${ITEM_BUCKET}/${path}` : null;
}

const SMALL_WORDS = new Set(["of", "the", "a", "an", "and", "or", "to", "in", "on"]);

/**
 * Nome do item a partir do nome do arquivo: "earth_ball.png" e "yellow-beak.png" viram "Earth Ball" e "Yellow Beak".
 * Se o arquivo já tem letras maiúsculas ("Rare Candy.png"), o nome é mantido. Dá para renomear depois no admin.
 */
export function nameFromFile(filename: string): string {
  const base = filename
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (base !== base.toLowerCase()) return base;
  return base
    .split(" ")
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ")
    .replace(/\bFarfetch D\b/, "Farfetch'd");
}

/** Ignora maiúsculas e acentos, para a busca por nome. */
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
