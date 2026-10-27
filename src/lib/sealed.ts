import { HUNTABLE_MEGAS, SEALED_HUNTS } from "@/config/sealed";
import type { Pokemon } from "@/types/pokemon";

/** É um Mega? Olha a variante, o nome da lista e o ID, porque o cadastro pode ter qualquer um dos três. */
export const isMega = (p: Pokemon): boolean => p.variant?.toLowerCase() === "mega" || /^mega[\s-]/i.test(p.sourceName ?? p.name) || p.id.startsWith("mega-");

/** Espécie em minúsculas, sem o "Mega" (ex.: "scolipede"). */
export const speciesOf = (p: Pokemon): string => p.name.replace(/^mega\s+/i, "").trim().toLowerCase();

/** Mega que é caça de verdade (hoje só a Clefable). */
export const isHuntableMega = (p: Pokemon): boolean => isMega(p) && HUNTABLE_MEGAS.includes(speciesOf(p));

/** Mega que é DZ, dropado de uma caça Sealed (todos os outros). */
export const isSealedDrop = (p: Pokemon): boolean => isMega(p) && !isHuntableMega(p);

/** "Mega Scolipede": o cadastro às vezes guarda só "Scolipede" com a variante "Mega". */
export const megaName = (p: Pokemon): string => (/^mega\s/i.test(p.sourceName ?? "") ? (p.sourceName as string) : `Mega ${p.name}`);

/** Nome da caça Sealed que dropa este Mega, se já estiver cadastrado em config/sealed.ts. */
export const sealedHuntOf = (p: Pokemon): string | null => SEALED_HUNTS[speciesOf(p)] ?? null;
