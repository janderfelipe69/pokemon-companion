/**
 * Banners da guilda (os rostos de Pokémon que dá para escolher no jogo). Cada linha evolutiva tem até 3 fases,
 * e as fases liberam conforme o nível da guilda: a 1ª do nível 0 ao 10, a 2ª do 11 ao 15, e a última no nível 16.
 * Para ajustar um nível de liberação ou incluir um banner novo, edite só este arquivo (a imagem vai em public/guild/banners/<id>.png).
 */
export type GuildBanner = {
  /** Identificador salvo no banco; é também o nome do arquivo da imagem. */
  id: string;
  name: string;
  /** Nome da linha evolutiva, só para agrupar na tela. */
  family: string;
  /** Nível da guilda em que o banner é liberado. */
  unlock: number;
};

/** Níveis em que cada fase é liberada. */
export const STAGE_UNLOCK = { first: 0, second: 11, last: 16 } as const;

export const GUILD_BANNERS: GuildBanner[] = [
  { id: "pichu", name: "Pichu", family: "Pichu", unlock: STAGE_UNLOCK.first },
  { id: "pikachu", name: "Pikachu", family: "Pichu", unlock: STAGE_UNLOCK.second },
  { id: "raichu", name: "Raichu", family: "Pichu", unlock: STAGE_UNLOCK.last },

  { id: "squirtle", name: "Squirtle", family: "Squirtle", unlock: STAGE_UNLOCK.first },
  { id: "wartortle", name: "Wartortle", family: "Squirtle", unlock: STAGE_UNLOCK.second },
  { id: "blastoise", name: "Blastoise", family: "Squirtle", unlock: STAGE_UNLOCK.last },

  { id: "bulbasaur", name: "Bulbasaur", family: "Bulbasaur", unlock: STAGE_UNLOCK.first },
  { id: "ivysaur", name: "Ivysaur", family: "Bulbasaur", unlock: STAGE_UNLOCK.second },
  { id: "venusaur", name: "Venusaur", family: "Bulbasaur", unlock: STAGE_UNLOCK.last },

  { id: "charmander", name: "Charmander", family: "Charmander", unlock: STAGE_UNLOCK.first },
  { id: "charmeleon", name: "Charmeleon", family: "Charmander", unlock: STAGE_UNLOCK.second },
  { id: "charizard", name: "Charizard", family: "Charmander", unlock: STAGE_UNLOCK.last },

  // A linha do Munchlax só tem duas fases. Assumi que o Snorlax é a 2ª fase (nível 11); se no jogo for outro nível, troque aqui.
  { id: "munchlax", name: "Munchlax", family: "Munchlax", unlock: STAGE_UNLOCK.first },
  { id: "snorlax", name: "Snorlax", family: "Munchlax", unlock: STAGE_UNLOCK.second },
];

/** Banner e nível que valem enquanto o admin não mudar nada (o estado atual da guilda). */
export const DEFAULT_BANNER = "charizard";
export const DEFAULT_GUILD_LEVEL = 16;
export const MAX_GUILD_LEVEL = 99;

export const bannerById = (id: string): GuildBanner | undefined => GUILD_BANNERS.find((b) => b.id === id);
export const bannerImage = (id: string) => `/guild/banners/${id}.png`;

/** As linhas evolutivas, na ordem da lista, cada uma com seus banners. */
export function bannerFamilies(): { family: string; banners: GuildBanner[] }[] {
  const families: { family: string; banners: GuildBanner[] }[] = [];
  for (const banner of GUILD_BANNERS) {
    const found = families.find((f) => f.family === banner.family);
    if (found) found.banners.push(banner);
    else families.push({ family: banner.family, banners: [banner] });
  }
  return families;
}

/** Texto curto de quando o banner libera. */
export const unlockLabel = (banner: GuildBanner) => (banner.unlock === 0 ? "Liberado desde o início" : `Libera no nível ${banner.unlock}`);

/** O que o admin salva: valida o banner e o nível. Devolve o erro em texto ou os dados limpos. */
export function parseBannerSettings(value: unknown): { banner: string; level: number } | string {
  const v = (value ?? {}) as { banner?: unknown; level?: unknown };
  if (typeof v.banner !== "string") return "Escolha um banner.";
  const banner = bannerById(v.banner);
  if (!banner) return "Banner desconhecido.";
  if (!Number.isInteger(v.level) || (v.level as number) < 0 || (v.level as number) > MAX_GUILD_LEVEL) return `O nível da guilda precisa ser um número inteiro de 0 a ${MAX_GUILD_LEVEL}.`;
  const level = v.level as number;
  if (level < banner.unlock) return `O banner ${banner.name} só libera no nível ${banner.unlock} da guilda (o nível informado é ${level}).`;
  return { banner: banner.id, level };
}
