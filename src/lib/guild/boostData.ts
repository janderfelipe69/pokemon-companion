import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuildMember = { id: number; name: string };

export const SETUP_HINT = "A guilda ainda não está pronta no banco. Rode o arquivo supabase/migrations/0009_guild_boosts.sql no SQL Editor do Supabase e tente de novo.";

type DbError = { code?: string; message?: string };
export const isSetupMissing = (e: DbError) => ["42P01", "42883", "PGRST205", "PGRST202"].includes(e.code ?? "") || /guild_members|guild_boost_wants|save_guild_wants/i.test(e.message ?? "");

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

/** Tipos escolhidos por cada membro: `Map<idDoMembro, tipos[]>`. */
export async function listWants(): Promise<Map<number, string[]>> {
  const { data, error } = await createAdminClient().from("guild_boost_wants").select("member_id, type").order("type", { ascending: true });
  if (error) throw new GuildDataError(isSetupMissing(error));
  const wants = new Map<number, string[]>();
  for (const row of (data ?? []) as { member_id: number; type: string }[]) {
    const list = wants.get(row.member_id) ?? [];
    list.push(row.type);
    wants.set(row.member_id, list);
  }
  return wants;
}

export async function saveWants(memberId: number, types: string[]): Promise<void> {
  const { error } = await createAdminClient().rpc("save_guild_wants", { p_member_id: memberId, p_types: types });
  if (error) throw Object.assign(new GuildDataError(isSetupMissing(error)), { code: error.code });
}
