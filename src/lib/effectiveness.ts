import { TYPE_CHART } from "@/config/typeChart";
import { POKEMON_TYPES, type PokemonType } from "@/types/pokemon";

/**
 * Níveis de efetividade usados pelo jogo:
 *  - "x2":   o alvo é fraco aos DOIS tipos (acerto duplo) → 2x
 *  - "x1.5": o alvo é fraco a apenas UM dos tipos (o outro é neutro) → 1.5x
 */
export type EffectLevel = "x2" | "x1.5";

export const EFFECT_MULTIPLIER: Record<EffectLevel, number> = { "x2": 2, "x1.5": 1.5 };

/** Multiplicador "de dentro do jogo" de um tipo atacante contra a tipagem do alvo (0, 0.25, 0.5, 1, 2 ou 4). */
export function rawMultiplier(attack: PokemonType, defenders: PokemonType[]): number {
  return defenders.reduce((acc, d) => {
    const row = TYPE_CHART[attack];
    if (row.zero.includes(d)) return 0;
    if (row.double.includes(d)) return acc * 2;
    if (row.half.includes(d)) return acc * 0.5;
    return acc;
  }, 1);
}

/** Converte o multiplicador bruto no nível do jogo. `null` = não é super efetivo. */
export function levelOf(raw: number): EffectLevel | null {
  if (raw >= 4) return "x2";
  if (raw >= 2) return "x1.5";
  return null;
}

export type AttackOption = { type: PokemonType; level: EffectLevel };

export type WeaknessProfile = {
  defenders: PokemonType[];
  /** Tipos de ataque que batem o alvo, do melhor para o pior (x2 primeiro). */
  attacks: AttackOption[];
  /** `true` se algum tipo bate 2x (os dois tipos do alvo são fracos a ele). */
  hasDouble: boolean;
  /**
   * Nível que "conta como 2x" para o time. Se o alvo tem acerto duplo, só o x2 é o ideal e o x1.5 é
   * reserva. Se o alvo só toma 1.5x (sem acerto duplo possível), o 1.5x é o máximo possível e passa a
   * valer como 2x, ou seja, todos os tipos fracos já são tratados como a efetividade máxima.
   */
  fullLevels: EffectLevel[];
};

export function weaknessProfile(defenders: PokemonType[]): WeaknessProfile {
  const attacks: AttackOption[] = [];
  for (const type of POKEMON_TYPES) {
    const level = levelOf(rawMultiplier(type, defenders));
    if (level) attacks.push({ type, level });
  }
  attacks.sort((a, b) => EFFECT_MULTIPLIER[b.level] - EFFECT_MULTIPLIER[a.level]);
  const hasDouble = attacks.some((a) => a.level === "x2");
  return { defenders, attacks, hasDouble, fullLevels: hasDouble ? ["x2"] : ["x1.5"] };
}

/** Melhor nível que algum dos tipos ofensivos do Pokémon alcança contra o alvo. */
export function bestAttackLevel(offensive: PokemonType[], defenders: PokemonType[]): { level: EffectLevel; type: PokemonType } | null {
  let best: { level: EffectLevel; type: PokemonType } | null = null;
  for (const type of offensive) {
    const level = levelOf(rawMultiplier(type, defenders));
    if (!level) continue;
    if (!best || EFFECT_MULTIPLIER[level] > EFFECT_MULTIPLIER[best.level]) best = { level, type };
  }
  return best;
}
