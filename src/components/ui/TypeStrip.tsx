import { typeInfo } from "@/config/pokemonTypes";
import { POKEMON_TYPES } from "@/types/pokemon";

const step = 100 / POKEMON_TYPES.length;
/** Um degradê "em blocos": cada um dos 18 tipos ocupa uma fatia igual da faixa. */
const gradient = `linear-gradient(90deg, ${POKEMON_TYPES.map((t, i) => `${typeInfo[t].color} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`).join(", ")})`;

/** Faixa fininha com as cores dos 18 tipos Pokémon. Só enfeite (some para leitores de tela). */
export function TypeStrip({ className = "h-0.5" }: { className?: string }) {
  return <div aria-hidden className={`w-full ${className}`} style={{ background: gradient }} />;
}
