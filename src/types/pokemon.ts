export const POKEMON_TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

/** Categorias de tier, na ordem em que aparecem na lista original. */
export const TIERS = [
  "Mythic",
  "Legendary",
  "Ultra Rare",
  "Super Rare",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
] as const;

export type Tier = (typeof TIERS)[number];

/** Campos reservados para etapas futuras (talentos e drops). Ainda não são usados na interface. */
export type TalentDrop = {
  itemName: string;
  quantity?: number;
};

/**
 * Valor decimal como texto canônico (ex.: "1500", "2.5"), sem notação científica.
 * Texto evita erros de ponto flutuante e não limita o tamanho do valor.
 */
export type DecimalString = string;

/** Preços independentes (nenhum é convertido do outro). `null` = não definido, nunca zero. */
export type PokemonPrices = { kk: DecimalString | null; brl: DecimalString | null };

/** Faixa de preço de um tier. `max` vazio = valor fixo (só o mínimo). */
export type PriceRange = { min: DecimalString | null; max: DecimalString | null };

/** Faixas padrão de um tier, em KK e em R$ (independentes). */
export type TierPriceRanges = { kk: PriceRange; brl: PriceRange };

/** Preços cadastrados, indexados pelo ID do Pokémon. Pokémon ausentes não têm preço. */
export type PriceMap = Record<string, Partial<PokemonPrices>>;

export type Pokemon = {
  /** Identificador único. Formas diferentes do mesmo Pokémon têm IDs diferentes. */
  id: string;
  name: string;
  /** Forma ou variante, como "Shiny". Omitido quando não se aplica. */
  variant?: string;
  /** Tipos defensivos e ofensivos são independentes e podem ser diferentes. */
  defensiveTypes: PokemonType[];
  offensiveTypes: PokemonType[];
  /** `null` = tier não definido na fonte ("?" ou vazio). Não é um tier especial. */
  tier?: Tier | null;
  /** Nome exatamente como aparece na lista importada (inclui "Shiny", "Mega" etc.). */
  sourceName?: string;
  /**
   * Tipo único informado na lista importada de Tiers e Valores: é o tipo ofensivo das skills do
   * Pokémon no jogo (não a tipagem original da espécie, que fica em `pokedexReference.ts`).
   * `null` = não definido.
   */
  listedType?: PokemonType | null;
  /** Origem na lista importada: linha e valores brutos de tier e tipo ("?" e vazio incluídos). */
  source?: { line: number; tier: string; type: string };
  /** Preço em KK (moeda do jogo). `null`/ausente = não definido; "0" é um preço cadastrado. */
  priceKk?: DecimalString | null;
  /** Preço em reais. `null`/ausente = não definido; "0" é um preço cadastrado. */
  priceBrl?: DecimalString | null;
  /** Limite superior da faixa de KK. Só existe quando o valor vem da faixa do tier. */
  priceKkMax?: DecimalString | null;
  /** Limite superior da faixa de R$. Só existe quando o valor vem da faixa do tier. */
  priceBrlMax?: DecimalString | null;
  /** `true` = o valor de KK vem do tier (não foi cadastrado para este Pokémon). */
  priceKkFromTier?: boolean;
  /** `true` = o valor de R$ vem do tier (não foi cadastrado para este Pokémon). */
  priceBrlFromTier?: boolean;
  notes?: string;
  /** Número na Pokédex nacional, quando cadastrado pelo administrador. */
  pokedexNumber?: number | null;
  /** URL de imagem cadastrada pelo administrador (usada quando não há imagem na referência). */
  imageUrl?: string | null;
  /** Próxima(s) evolução(ões), em texto. */
  evolution?: string | null;
  /** Item necessário para evoluir (opcional). */
  evolutionItem?: string | null;
  /** Reservado para a etapa de drops de talentos. */
  talentDrops?: TalentDrop[];
};
