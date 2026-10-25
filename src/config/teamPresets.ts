import type { Tier } from "@/types/pokemon";

/** Máximo de estrelas que um Pokémon pode ter no jogo. */
export const MAX_STARS = 5;

export type PresetTier = {
  tier: Tier;
  /**
   * Estrelas (1 a 5) que o time assume para os Pokémon deste tier. O estrelamento aumenta o dano que o
   * Pokémon causa e é o que permite um tier mais baixo ser eficiente. Omitido = sem estrelas.
   * A futura calculadora de stars deve usar este valor como ponto de partida.
   */
  stars?: number;
    /** Quanto maior, mais o montador prefere este tier (entre Pokémon com a mesma efetividade). */
  priority: number;
  /** Máximo de Pokémon deste tier no time. */
  max?: number;
  /** Mínimo desejado (aplicado só se houver Pokémon efetivos suficientes). */
  min?: number;
};

/** Pokémon específico que entra no tipo de time mesmo fora dos tiers dele (identificado pelo ID da Pokédex). */
export type PresetExtra = { id: string; priority: number; stars?: number };

/**
 * Espécies "coringa": podem usar qualquer tipo ofensivo (ex.: Smeargle). Não precisam ter tipo ofensivo
 * cadastrado; o montador escolhe o tipo que o time precisa. Nome da espécie em minúsculas, sem variante.
 */
export const WILDCARD_SPECIES = ["smeargle"];

export type TeamPreset = {
  id: "economico" | "razoavel" | "super-rare" | "excepcional" | "fora-de-base";
  label: string;
  tagline: string;
  description: string;
  tiers: PresetTier[];
  /**
   * `true` = este tipo de time tem uma lista de "Pokémon úteis" editável no admin. Com pelo menos 1 Pokémon
   * na lista, o montador sorteia só entre eles; com a lista vazia, usa todos os Pokémon dos tiers acima.
   */
  curated?: boolean;
  /** Pokémon que entram neste tipo de time mesmo fora dos tiers acima (ex.: Shiny Smeargle no time de SR). */
  extras?: PresetExtra[];
  /**
   * Tiers de reforço: só entram para completar os 6 quando o tipo de time não tem Pokémon efetivos
   * suficientes. Aparecem marcados como "reforço" e podem ser desligados na tela.
   */
  fallback?: PresetTier[];
};

/** Regras de cada tipo de time. Para ajustar a composição, edite só este arquivo. */
export const TEAM_PRESETS: TeamPreset[] = [
  {
    id: "economico",
    label: "Fraco, eficiente e barato",
    tagline: "T2 com 2★ + T1",
    description: "Base de T2 estrelados em 2★ (mais dano que o tier mostra), completando com T1 quando for preciso bater a efetividade.",
    curated: true,
    tiers: [
      { tier: "T2", priority: 2, stars: 2 },
      { tier: "T1", priority: 1, max: 2 },
    ],
  },
  {
    id: "razoavel",
    label: "Razoável",
    tagline: "T1 + 1 ou 2 Super Rare",
    description: "Vários T1, com 1 ou 2 Super Rare. Mais forte, mas não tão barato.",
    tiers: [
      { tier: "T1", priority: 2 },
      { tier: "Super Rare", priority: 1, min: 1, max: 2 },
    ],
  },
  {
    id: "super-rare",
    label: "Só Super Rare",
    tagline: "Nem barato, nem caro",
    description: "Time só de Super Rare: um pouco mais trabalhoso de montar. O Shiny Smeargle entra como coringa, em qualquer tipo.",
    tiers: [{ tier: "Super Rare", priority: 2 }],
    extras: [{ id: "shiny-smeargle", priority: 2 }],
    fallback: [{ tier: "T1", priority: 1 }],
  },
  {
    id: "excepcional",
    label: "Excepcional",
    tagline: "Legendary + Ultra Rare",
    description: "Time de alto nível com Legendary e Ultra Rare.",
    tiers: [
      { tier: "Legendary", priority: 2 },
      { tier: "Ultra Rare", priority: 2 },
    ],
    fallback: [
      { tier: "Super Rare", priority: 2 },
      { tier: "T1", priority: 1 },
    ],
  },
  {
    id: "fora-de-base",
    label: "Fora de base",
    tagline: "Legendary + Mythic",
    description: "O topo: Mythic sempre que possível, completando com Legendary.",
    tiers: [
      { tier: "Mythic", priority: 2 },
      { tier: "Legendary", priority: 1 },
    ],
    fallback: [
      { tier: "Ultra Rare", priority: 2 },
      { tier: "Super Rare", priority: 1 },
    ],
  },
];

/** Tiers que podem aparecer como alvo de caça. Os demais não entram em rotação. */
export const HUNT_TIERS: Tier[] = ["Mythic", "Legendary", "Ultra Rare"];
