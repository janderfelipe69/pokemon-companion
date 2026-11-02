import "server-only";
import { DROP_TTL_HOURS, normalizeWants, sortDrops, type BoostWant, type DropStone } from "@/config/guildBoost";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRoundActive } from "./boostRound";
import { reconcileTransfers, type Participant, type StoredTransfer } from "./boostTrades";

export type GuildMember = { id: number; name: string };

export const SETUP_HINT = "A guilda ainda não está pronta no banco. Rode os arquivos supabase/migrations/0009_guild_boosts.sql, 0010_guild_boost_tiers.sql, 0011_guild_boost_drops.sql e 0022_guild_boost_transfers.sql (nessa ordem) no SQL Editor do Supabase e tente de novo.";

type DbError = { code?: string; message?: string };
export const isSetupMissing = (e: DbError) => ["42P01", "42883", "42703", "PGRST205", "PGRST202"].includes(e.code ?? "") || /guild_members|guild_boost_wants|save_guild_tier_wants|guild_boost_drops|guild_boost_transfers|publish_guild_drops|tiers/i.test(e.message ?? "");

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

export type DropPost = { memberId: number; postedAt: string; stones: DropStone[] };

/** Drops da rodada atual, um por membro. O que passou das 3h da manhã não aparece mais (e o banco apaga na próxima publicação). */
export async function listDrops(): Promise<DropPost[]> {
  const cutoff = new Date(Date.now() - DROP_TTL_HOURS * 3600_000).toISOString();
  const { data, error } = await createAdminClient().from("guild_boost_drops").select("member_id, type, tier, qty, posted_at").gte("posted_at", cutoff);
  if (error) throw new GuildDataError(isSetupMissing(error));
  const posts = new Map<number, { postedAt: string; stones: DropStone[] }>();
  for (const row of (data ?? []) as { member_id: number; type: DropStone["type"]; tier: DropStone["tier"]; qty: number; posted_at: string }[]) {
    const post = posts.get(row.member_id) ?? { postedAt: row.posted_at, stones: [] };
    post.stones.push({ type: row.type, tier: row.tier, qty: row.qty });
    if (row.posted_at < post.postedAt) post.postedAt = row.posted_at;
    posts.set(row.member_id, post);
  }
  return [...posts].filter(([, post]) => isRoundActive(new Date(post.postedAt))).map(([memberId, post]) => ({ memberId, postedAt: post.postedAt, stones: sortDrops(post.stones) }));
}

/** Troca tudo que o membro tinha publicado pela lista enviada (vazia = retira). A lista precisa vir de `parseDrops`. */
export async function publishDrops(memberId: number, stones: DropStone[]): Promise<void> {
  const { error } = await createAdminClient().rpc("publish_guild_drops", { p_member_id: memberId, p_drops: stones });
  if (error) throw Object.assign(new GuildDataError(isSetupMissing(error)), { code: error.code });
}

// ── Trocas guardadas ──────────────────────────────────────────────────────────

type TransferRow = { id: number; from_member: number; to_member: number; type: DropStone["type"]; tier: DropStone["tier"]; qty: number; done: boolean; created_at: string };

/** Trocas da rodada atual, já com o nome de quem entrega e de quem recebe. */
export async function listTransfers(members?: readonly GuildMember[]): Promise<StoredTransfer[]> {
  const names = new Map((members ?? (await listMembers())).map((m) => [m.id, m.name]));
  const cutoff = new Date(Date.now() - DROP_TTL_HOURS * 3600_000).toISOString();
  const { data, error } = await createAdminClient().from("guild_boost_transfers").select("id, from_member, to_member, type, tier, qty, done, created_at").gte("created_at", cutoff).order("id", { ascending: true });
  if (error) throw new GuildDataError(isSetupMissing(error));
  return (data as TransferRow[])
    .filter((r) => isRoundActive(new Date(r.created_at)) && names.has(r.from_member) && names.has(r.to_member))
    .map((r) => ({ id: r.id, from: names.get(r.from_member)!, to: names.get(r.to_member)!, type: r.type, tier: r.tier, qty: r.qty, done: r.done }));
}

/**
 * Atualiza as trocas guardadas depois de qualquer mudança na rodada (publicou, retirou, mudou o que quer).
 * Só mexe no que for preciso: o que já foi apontado continua com a mesma pessoa. Roda duas vezes: se duas publicações
 * acontecerem juntas e apontarem a mesma stone, a segunda passada tira o excesso.
 */
export async function reconcileRound(): Promise<void> {
  const db = createAdminClient();
  void db.from("guild_boost_transfers").delete().lt("created_at", new Date(Date.now() - DROP_TTL_HOURS * 3600_000).toISOString()).then(() => undefined);
  for (let pass = 0; pass < 2; pass++) {
    const [members, wants, drops] = await Promise.all([listMembers(), listWants(), listDrops()]);
    const transfers = await listTransfers(members);
    const ids = new Map(members.map((m) => [m.name, m.id]));
    const names = new Map(members.map((m) => [m.id, m.name]));
    const participants: Participant[] = drops.filter((d) => names.has(d.memberId)).map((d) => ({ name: names.get(d.memberId)!, stones: d.stones, wants: wants.get(d.memberId) ?? [] }));

    const { remove, add } = reconcileTransfers(participants, transfers);
    if (remove.length === 0 && add.length === 0) return;
    if (remove.length > 0) {
      const { error } = await db.from("guild_boost_transfers").delete().in("id", remove);
      if (error) throw new GuildDataError(isSetupMissing(error));
    }
    if (add.length > 0) {
      const rows = add.map((t) => ({ from_member: ids.get(t.from)!, to_member: ids.get(t.to)!, type: t.type, tier: t.tier, qty: t.qty }));
      const { error } = await db.from("guild_boost_transfers").insert(rows);
      if (error) throw new GuildDataError(isSetupMissing(error));
    }
  }
}

/** Marca (ou desmarca) trocas como feitas. Só vale para quem entrega ou recebe; devolve quantas foram alteradas. */
export async function setTransfersDone(memberId: number, ids: number[], done: boolean): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("guild_boost_transfers")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .in("id", ids)
    .or(`from_member.eq.${memberId},to_member.eq.${memberId}`)
    .select("id");
  if (error) throw new GuildDataError(isSetupMissing(error));
  return data?.length ?? 0;
}
