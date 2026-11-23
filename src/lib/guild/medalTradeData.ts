import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { expectedNotifications, MAX_MEDAL_QTY, notificationId, type MedalOffer, type MedalWant, type NotificationKey } from "./medalTrades";

export const MEDAL_SETUP_HINT = "A troca de medalhas ainda não está pronta no banco. Rode os arquivos supabase/migrations/0023, 0024 e 0025 (nessa ordem) no SQL Editor do Supabase e tente de novo.";

export class MedalTradeError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };
const setupMissing = (e: DbError) => ["42P01", "42883", "PGRST205", "PGRST202"].includes(e.code ?? "") || /guild_medal/i.test(e.message ?? "");

function fail(error: DbError): never {
  if (error.code === "GM001") throw new MedalTradeError("Você não pode ter e querer a mesma medalha. Tire de uma das listas primeiro.", 409);
  if (error.code === "GM002") throw new MedalTradeError("Essa troca já mudou (alguém atualizou a lista). A tela vai atualizar.", 409);
  if (error.code === "GM004") throw new MedalTradeError("Medalhas demais na lista de “quero”.", 400);
  if (error.code === "23503") throw new MedalTradeError("Esse membro não está mais na guilda. Entre de novo.", 401);
  if (setupMissing(error)) throw new MedalTradeError(MEDAL_SETUP_HINT, 500);
  throw new MedalTradeError("Não foi possível falar com o banco da guilda.", 500);
}

/** Medalhas que cada membro tem para trocar. */
export async function listOffers(): Promise<MedalOffer[]> {
  const { data, error } = await createAdminClient().from("guild_medal_offers").select("member_id, medal_id, qty");
  if (error) fail(error);
  return ((data ?? []) as { member_id: number; medal_id: number; qty: number }[]).map((r) => ({ memberId: r.member_id, medalId: r.medal_id, qty: r.qty }));
}

/** Medalhas que cada membro quer. */
export async function listWants(): Promise<MedalWant[]> {
  const { data, error } = await createAdminClient().from("guild_medal_wants").select("member_id, medal_id");
  if (error) fail(error);
  return ((data ?? []) as { member_id: number; medal_id: number }[]).map((r) => ({ memberId: r.member_id, medalId: r.medal_id }));
}

/** Define a quantidade de uma medalha que o membro tem (0 remove). */
export async function setOffer(memberId: number, medalId: number, qty: number): Promise<void> {
  const { error } = await createAdminClient().rpc("set_guild_medal_offer", { p_member_id: memberId, p_medal_id: medalId, p_qty: Math.min(Math.max(qty, 0), MAX_MEDAL_QTY) });
  if (error) fail(error);
}

/** Troca a lista de "quero" do membro pela lista enviada (vazia = limpa). */
export async function setWants(memberId: number, medalIds: number[]): Promise<void> {
  const { error } = await createAdminClient().rpc("set_guild_medal_wants", { p_member_id: memberId, p_wants: medalIds });
  if (error) fail(error);
}

/** `giver` entrega a medalha e `receiver` a recebe: some do "tenho" de um (na quantidade) e do "quero" do outro. */
export async function completeTrade(giver: number, receiver: number, medalId: number, qty: number): Promise<void> {
  const { error } = await createAdminClient().rpc("complete_guild_medal_trade", { p_giver: giver, p_receiver: receiver, p_medal_id: medalId, p_qty: qty });
  if (error) fail(error);
}

/**
 * Deixa os avisos iguais ao que bate hoje: cria os que faltam (não lidos, menos para quem acabou de mexer nas próprias listas)
 * e apaga os que deixaram de valer (medalha trocada ou removida).
 */
export async function syncNotifications(actorId: number): Promise<void> {
  const db = createAdminClient();
  const [offers, wants, existing] = await Promise.all([listOffers(), listWants(), db.from("guild_medal_notifications").select("member_id, other_id, medal_id, direction")]);
  if (existing.error) fail(existing.error);

  const wanted = expectedNotifications(offers, wants);
  const wantedIds = new Set(wanted.map(notificationId));
  const current = ((existing.data ?? []) as { member_id: number; other_id: number; medal_id: number; direction: "give" | "get" }[]).map((r): NotificationKey => ({ memberId: r.member_id, otherId: r.other_id, medalId: r.medal_id, direction: r.direction }));
  const currentIds = new Set(current.map(notificationId));

  const add = wanted.filter((n) => !currentIds.has(notificationId(n)));
  const stale = current.filter((n) => !wantedIds.has(notificationId(n)));

  if (add.length > 0) {
    const { error } = await db.from("guild_medal_notifications").upsert(
      add.map((n) => ({ member_id: n.memberId, other_id: n.otherId, medal_id: n.medalId, direction: n.direction, read: n.memberId === actorId })),
      { onConflict: "member_id,other_id,medal_id,direction", ignoreDuplicates: true },
    );
    if (error) fail(error);
  }
  if (stale.length > 0) {
    await Promise.all(
      stale.map(async (n) => {
        const { error } = await db.from("guild_medal_notifications").delete().match({ member_id: n.memberId, other_id: n.otherId, medal_id: n.medalId, direction: n.direction });
        if (error) fail(error);
      }),
    );
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
