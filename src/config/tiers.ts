import type { Tier } from "@/types/pokemon";

/** Chave de agrupamento: um tier da lista ou "undefined" (tier não definido). */
export type TierKey = Tier | "undefined";

/**
 * Cores usadas só para facilitar a leitura. Não são cores oficiais.
 * T1–T7: escala de verde-água; categorias especiais: uma cor distinta cada.
 */
export const tierColors: Record<TierKey, string> = {
  T1: "#43d0b4",
  T2: "#3fbfa8",
  T3: "#4aa99b",
  T4: "#5b9a93",
  T5: "#66898a",
  T6: "#6f7b84",
  T7: "#767f8c",
  "Super Rare": "#5b8def",
  "Ultra Rare": "#a47bf0",
  Legendary: "#f2b84b",
  Mythic: "#ee6b8b",
  undefined: "#4b536b",
};

export const UNDEFINED_TIER_LABEL = "Tier não definido";

export function tierLabel(key: TierKey): string {
  return key === "undefined" ? UNDEFINED_TIER_LABEL : key;
}
