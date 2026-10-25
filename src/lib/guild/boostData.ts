import "server-only";
import { normalizeWants, type BoostWant } from "@/config/guildBoost";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuildMember = { id: number; name: string };

export const SETUP_HINT = "A guilda ainda não está pronta no banco. Rode os arquivos supabase/migrations/0009_guild_boosts.sql e 0010_guild_boost_tiers.sql (nessa ordem) no SQL Editor do Supabase e tente de novo.";

type DbError = { code?: string; message?: string };
export const isSetupMissing = (e: DbError) => ["42P01", "42883", "42703", "PGRST205", "PGRST202"].includes(e.code ?? "") || /guild_members|guild_boost_wants|save_guild_tier_wants|tiers/i.test(e.message ?? "");

export class GuildDataError extends Error {
  constructor(public setupMissing: boolean) {
    super(setupMissing ? SETUP_HINT : "Não foi possível consultar a guilda.");
  }
}

export async function listMembers(): Promise<GuildMember[]> {
  const { data, error } = await createAdminClient().from("guild_members").select("id, name").order("name", { ascending: true });
  if (error) throw new GuildDataError(isSetupMissing(error));
  return (data ?? []) as GuildMember[];
}

/** O que cada membro quer: `Map<idDoMembro, { tipo, níveis }[]>`, já na ordem do jogo. */
export async function listWants(): Promise<Map<number, BoostWant[]>> {
  const { data, error } = await createAdminClient().from("guild_boost_wants").select("member_id, type, tiers");
  if (error) throw new GuildDataError(isSetupMissing(error));
  const rows = new Map<number, { type: string; tiers: string[] }[]>();
  for (const row of (data ?? []) as { member_id: number; type: string; tiers: string[] }[]) {
    const list = rows.get(row.member_id) ?? [];
    list.push({ type: row.type, tiers: row.tiers });
    rows.set(row.member_id, list);
  }
  return new Map([...rows].map(([id, list]) => [id, normalizeWants(list)]));
}

/** Troca tudo que o membro quer pela lista enviada (lista vazia = limpa). A lista precisa vir de `parseWants`. */
export async function saveWants(memberId: number, wants: BoostWant[]): Promise<void> {
  const { error } = await createAdminClient().rpc("save_guild_tier_wants", { p_member_id: memberId, p_wants: wants });
  if (error) throw Object.assign(new GuildDataError(isSetupMissing(error)), { code: error.code });
}
