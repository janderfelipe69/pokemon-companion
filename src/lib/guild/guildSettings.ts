import "server-only";
import { DEFAULT_BANNER, DEFAULT_GUILD_LEVEL, bannerById } from "@/config/guildBanners";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSetupMissing } from "./boostData";

export const SETTINGS_SETUP_HINT = "O banner da guilda ainda não está pronto no banco. Rode o arquivo supabase/migrations/0018_guild_banner.sql no SQL Editor do Supabase e tente de novo.";

export class GuildSettingsError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export type GuildSettings = { banner: string; level: number };

const translate = (e: { code?: string; message?: string }) => {
  if (isSetupMissing(e) || /guild_settings/i.test(e.message ?? "")) return new GuildSettingsError(SETTINGS_SETUP_HINT);
  console.error("[guild-settings]", e.code, e.message);
  return new GuildSettingsError("Não foi possível consultar o banner da guilda.");
};

/** O banner em uso e o nível da guilda. Se a linha ainda não existe, vale o padrão (Charizard, nível 16). */
export async function getGuildSettings(): Promise<GuildSettings> {
  const { data, error } = await createAdminClient().from("guild_settings").select("banner, guild_level").eq("id", 1).maybeSingle();
  if (error) throw translate(error);
  const row = data as { banner: string; guild_level: number } | null;
  // Se um banner foi tirado da lista no código, volta para o padrão em vez de quebrar a tela.
  return { banner: row && bannerById(row.banner) ? row.banner : DEFAULT_BANNER, level: row ? Number(row.guild_level) : DEFAULT_GUILD_LEVEL };
}

export async function saveGuildSettings(settings: GuildSettings): Promise<void> {
  const { error } = await createAdminClient().from("guild_settings").upsert({ id: 1, banner: settings.banner, guild_level: settings.level, updated_at: new Date().toISOString() });
  if (error) throw translate(error);
}
