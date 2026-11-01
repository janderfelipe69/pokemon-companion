import "server-only";
import { GUILD } from "@/config/guild";
import { bannerById, bannerImage, type GuildBanner } from "@/config/guildBanners";
import { getGuildSettings } from "./guildSettings";

export type GuildEmblem = {
  /** Imagem do emblema: o banner em uso, ou o emblema padrão se o banco não responder. */
  src: string;
  /** O banner em uso (`null` = está usando o emblema padrão). */
  banner: GuildBanner | null;
  level: number | null;
};

/** O que mostrar como "cara" da guilda: o banner que o admin escolheu. Se o banco falhar, cai no emblema padrão sem quebrar a página. */
export async function getGuildEmblem(): Promise<GuildEmblem> {
  try {
    const settings = await getGuildSettings();
    const banner = bannerById(settings.banner) ?? null;
    if (banner) return { src: bannerImage(banner.id), banner, level: settings.level };
  } catch {
    /* sem banco (ou migration ainda não rodada): segue com o emblema padrão */
  }
  return { src: GUILD.emblem, banner: null, level: null };
}
