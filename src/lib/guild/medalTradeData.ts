import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { expectedNotifications, MAX_MEDAL_QTY, notificationId, type MedalOffer, type NotificationKey } from "./medalTrades";

export const MEDAL_SETUP_HINT = "A troca de medalhas ainda não está pronta no banco. Rode os arquivos supabase/migrations/0023_guild_medal_trades.sql e 0024_guild_medal_offers.sql (nessa ordem) no SQL Editor do Supabase e tente de novo.";

export class MedalTradeError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };
const setupMissing = (e: DbError) => ["42P01", "42883", "PGRST205", "PGRST202"].includes(e.code ?? "") || /guild_medal/i.test(e.message ?? "");

function fail(error: DbError): never {
  if (error.code === "GM001") throw new MedalTradeError("Você não pode ter a mesma medalha para trocar e na lista de “quero em troca”. Tire de um dos lados primeiro.", 409);
  if (error.code === "GM002") throw new MedalTradeError("Essa troca já mudou (alguém atualizou a quantidade). A tela vai atualizar.", 409);
  if (error.code === "GM003") throw new MedalTradeError("Essa medalha não está mais nas suas ofertas.", 409);
  if (error.code === "GM004") throw new MedalTradeError("Medalhas demais na lista de “quero em troca”.", 400);
  if (error.code === "23503") throw new MedalTradeError("Esse membro não está mais na guilda. Entre de novo.", 401);
  if (setupMissing(error)) throw new MedalTradeError(MEDAL_SETUP_HINT, 500);
  throw new MedalTradeError("Não foi possível falar com o banco da guilda.", 500);
}

/** Todas as ofertas da guilda, cada uma com o que aceita em troca. */
export async function listOffers(): Promise<MedalOffer[]> {
  const db = createAdminClient();
  const [offers, wants] = await Promise.all([db.from("guild_medal_offers").select("member_id, medal_id, qty"), db.from("guild_medal_offer_wants").select("member_id, medal_id, want_medal_id")]);
  if (offers.error) fail(offers.error);
  if (wants.error) fail(wants.error);

  const byOffer = new Map<string, number[]>();
  for (const w of (wants.data ?? []) as { member_id: number; medal_id: number; want_medal_id: number }[]) {
    const key = `${w.member_id}:${w.medal_id}`;
    byOffer.set(key, [...(byOffer.get(key) ?? []), w.want_medal_id]);
  }
  return ((offers.data ?? []) as { member_id: number; medal_id: number; qty: number }[]).map((o) => ({
    memberId: o.member_id,
    medalId: o.medal_id,
    qty: o.qty,
    wants: (byOffer.get(`${o.member_id}:${o.medal_id}`) ?? []).sort((a, b) => a - b),
  }));
}

/** Define a quantidade de uma oferta do membro (0 remove). */
export async function setOffer(memberId: number, medalId: number, qty: number): Promise<void> {
  const { error } = await createAdminClient().rpc("set_guild_medal_offer", { p_member_id: memberId, p_medal_id: medalId, p_qty: Math.min(Math.max(qty, 0), MAX_MEDAL_QTY) });
  if (error) fail(error);
}

/** Troca a lista de "aceito em troca" de uma oferta pela lista enviada. */
export async function setWants(memberId: number, medalId: number, wants: number[]): Promise<void> {
  const { error } = await createAdminClient().rpc("set_guild_medal_wants", { p_member_id: memberId, p_medal_id: medalId, p_wants: wants });
  if (error) fail(error);
}

/** Troca feita entre duas ofertas: as duas diminuem na mesma quantidade e somem ao chegar a 0. */
export async function completeTrade(memberA: number, medalA: number, memberB: number, medalB: number, qty: number): Promise<void> {
  const { error } = await createAdminClient().rpc("complete_guild_medal_trade", { p_member_a: memberA, p_medal_a: medalA, p_member_b: memberB, p_medal_b: medalB, p_qty: qty });
  if (error) fail(error);
}

/**
 * Deixa os avisos iguais ao que combina hoje: cria os que faltam (não lidos, menos para quem acabou de mexer nas próprias ofertas)
 * e apaga os que deixaram de valer (troca feita, oferta removida ou pedido retirado).
 */
export async function syncNotifications(actorId: number): Promise<void> {
  const db = createAdminClient();
  const [offers, existing] = await Promise.all([listOffers(), db.from("guild_medal_notifications").select("member_id, other_id, my_medal, their_medal")]);
  if (existing.error) fail(existing.error);

  const wanted = expectedNotifications(offers);
  const wantedIds = new Set(wanted.map(notificationId));
  const current = ((existing.data ?? []) as { member_id: number; other_id: number; my_medal: number; their_medal: number }[]).map((r): NotificationKey => ({ memberId: r.member_id, otherId: r.other_id, myMedalId: r.my_medal, theirMedalId: r.their_medal }));
  const currentIds = new Set(current.map(notificationId));

  const add = wanted.filter((n) => !currentIds.has(notificationId(n)));
  const stale = current.filter((n) => !wantedIds.has(notificationId(n)));

  if (add.length > 0) {
    const { error } = await db.from("guild_medal_notifications").upsert(
      add.map((n) => ({ member_id: n.memberId, other_id: n.otherId, my_medal: n.myMedalId, their_medal: n.theirMedalId, read: n.memberId === actorId })),
      { onConflict: "member_id,other_id,my_medal,their_medal", ignoreDuplicates: true },
    );
    if (error) fail(error);
  }
  for (const n of stale) {
    const { error } = await db.from("guild_medal_notifications").delete().match({ member_id: n.memberId, other_id: n.otherId, my_medal: n.myMedalId, their_medal: n.theirMedalId });
    if (error) fail(error);
  }
}

/** Quem tem uma troca nova ainda não vista por este membro (sem repetir). */
export async function unreadOthers(memberId: number): Promise<number[]> {
  const { data, error } = await createAdminClient().from("guild_medal_notifications").select("other_id").eq("member_id", memberId).eq("read", false);
  if (error) fail(error);
  return [...new Set(((data ?? []) as { other_id: number }[]).map((r) => r.other_id))];
}

export async function markAllRead(memberId: number): Promise<void> {
  const { error } = await createAdminClient().from("guild_medal_notifications").update({ read: true }).eq("member_id", memberId).eq("read", false);
  if (error) fail(error);
}
