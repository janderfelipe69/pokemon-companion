import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDrops, listMembers, listWants } from "./boostData";
import { roundEnd } from "./boostRound";
import { planTrades, stoneLabel, type TradePlan, type Transfer } from "./boostTrades";

const WEBHOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const BOT_NAME = "Boosts da Guilda";
const GOLD = 0xf2b84b;
const CHUNK_LIMIT = 3800; // o Discord aceita 4096 caracteres na descrição de um embed; sobra folga para o resto
const MAX_MESSAGES = 6;

/** A URL do webhook (segredo, só no servidor). `null` se não foi configurada ou não parece um webhook do Discord. */
const webhookUrl = (): string | null => {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  return url && WEBHOOK_RE.test(url) ? url : null;
};

export const isDiscordConfigured = () => webhookUrl() !== null;

/** Endereço público do site, para o link na mensagem (a Vercel fornece o domínio de produção sozinha). */
function siteUrl(): string | null {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : null;
}

// ── Montagem da mensagem ──────────────────────────────────────────────────────

/** Nick vira texto simples: sem negrito/itálico acidental. (Menções já são bloqueadas por `allowed_mentions`.) */
const esc = (text: string) => text.replace(/([\\*_~`|>])/g, "\\$1");

function givesLines(name: string, gives: readonly Transfer[]): string[] {
  const receivers = [...new Set(gives.map((t) => t.to))];
  return [`**${esc(name)}** entrega`, ...receivers.map((to) => `→ **${esc(to)}**: ${gives.filter((t) => t.to === to).map(stoneLabel).join(", ")}`)];
}

/** O plano em partes de no máximo ~3800 caracteres, sempre quebrando entre linhas. */
export function planChunks(plan: TradePlan): string[] {
  const blocks: string[][] = plan.people.filter((p) => p.gives.length > 0).map((p) => givesLines(p.name, p.gives));
  if (blocks.length === 0) blocks.push([plan.people.length === 0 ? "Ninguém publicou drops nesta rodada." : "Nenhuma troca por enquanto."]);

  const idle = plan.people.filter((p) => p.gives.length === 0 && p.gets.length === 0).map((p) => esc(p.name));
  if (idle.length > 0 && plan.people.length > 0) blocks.push([`*Sem trocas:* ${idle.join(", ")}`]);
  if (plan.leftover.length > 0) blocks.push([`*Sobrou (ninguém quer):* ${plan.leftover.map((l) => `${stoneLabel(l)} de ${esc(l.owner)}`).join(", ")}`]);

  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const block of blocks) {
    for (const line of block) {
      const cost = line.length + 1;
      if (size + cost > CHUNK_LIMIT && current.length > 0) {
        chunks.push(current.join("\n"));
        current = [];
        size = 0;
      }
      current.push(line.slice(0, CHUNK_LIMIT));
      size += cost;
    }
    current.push(""); // linha em branco entre pessoas
    size += 1;
  }
  chunks.push(current.join("\n").trim());
  return chunks.filter(Boolean).slice(0, MAX_MESSAGES);
}

function buildEmbeds(chunks: readonly string[], participants: number, updatedAt: Date) {
  const link = siteUrl();
  return chunks.map((description, i) => ({
    ...(i === 0 ? { title: "Plano de trocas do boss", ...(link ? { url: link } : {}) } : {}),
    description,
    color: GOLD,
    footer: { text: `${participants} ${participants === 1 ? "pessoa publicou" : "pessoas publicaram"}${chunks.length > 1 ? ` · parte ${i + 1}/${chunks.length}` : ""}` },
    timestamp: updatedAt.toISOString(), // o Discord mostra no horário de quem está vendo
  }));
}

// ── Chamadas ao Discord ───────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Chama o webhook; se o Discord pedir para esperar (429), espera um pouco e tenta mais uma vez. */
async function hook(url: string, method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<Response> {
  const attempt = () => fetch(`${url}${path}`, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) });
  let response = await attempt();
  if (response.status === 429) {
    const data = (await response.json().catch(() => ({}))) as { retry_after?: number };
    const wait = Math.min(Math.ceil((data.retry_after ?? 1) * 1000), 3000);
    await sleep(wait);
    response = await attempt();
  }
  return response;
}

async function postMessage(url: string, embed: object): Promise<string> {
  const response = await hook(url, "POST", "?wait=true", { username: BOT_NAME, embeds: [embed], allowed_mentions: { parse: [] } });
  if (!response.ok) throw new Error(`Discord recusou a mensagem (${response.status}).`);
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  if (!data.id) throw new Error("O Discord não devolveu o id da mensagem.");
  return data.id;
}

/** Edita uma mensagem; devolve `false` se ela não existe mais (alguém apagou no Discord). */
async function editMessage(url: string, id: string, embed: object): Promise<boolean> {
  const response = await hook(url, "PATCH", `/messages/${id}`, { embeds: [embed], allowed_mentions: { parse: [] } });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Discord recusou a edição (${response.status}).`);
  return true;
}

// ── Estado da rodada no banco ─────────────────────────────────────────────────

type RoundRow = { message_ids: string[]; updated_at: string };

async function readRound(key: string): Promise<RoundRow | null> {
  const { data, error } = await createAdminClient().from("guild_discord_rounds").select("message_ids, updated_at").eq("round_key", key).maybeSingle();
  if (error) throw new Error(`Banco: ${error.message}`);
  return (data as RoundRow | null) ?? null;
}

async function currentPlan(): Promise<{ plan: TradePlan; participants: number }> {
  const [members, wants, drops] = await Promise.all([listMembers(), listWants(), listDrops()]);
  const byId = new Map(members.map((m) => [m.id, m.name]));
  const participants = drops
    .filter((d) => byId.has(d.memberId))
    .map((d) => ({ name: byId.get(d.memberId)!, stones: d.stones, wants: wants.get(d.memberId) ?? [] }));
  return { plan: planTrades(participants), participants: participants.length };
}

export type SyncResult = { ok: true; skipped?: "not-configured" | "nothing-to-say" | "too-soon" } | { ok: false; error: string };

/**
 * Cria (ou atualiza) a mensagem do plano da rodada no Discord.
 * A primeira chamada da rodada posta; as seguintes editam a mesma mensagem. Nunca lança erro:
 * se o Discord falhar, o resultado diz o motivo e quem chamou segue a vida.
 */
export async function syncDiscordPlan(options: { minIntervalMs?: number } = {}): Promise<SyncResult> {
  const url = webhookUrl();
  if (!url) return { ok: true, skipped: "not-configured" };

  try {
    const db = createAdminClient();
    const key = roundEnd(new Date()).toISOString(); // a rodada de agora é identificada por quando ela termina

    let round = await readRound(key);
    if (!round) {
      // "Reserva" a rodada: se duas pessoas publicarem juntas, só uma cria a mensagem e a outra edita.
      const { error } = await db.from("guild_discord_rounds").insert({ round_key: key });
      if (error && error.code !== "23505") throw new Error(`Banco: ${error.message}`);
      if (error) {
        await sleep(1500);
        round = await readRound(key);
      }
    } else if (round.message_ids.length === 0) {
      await sleep(1500); // outra publicação está criando a mensagem agora
      round = (await readRound(key)) ?? round;
    }

    const known = round?.message_ids ?? [];
    if (options.minIntervalMs && known.length > 0 && round && Date.now() - new Date(round.updated_at).getTime() < options.minIntervalMs) return { ok: true, skipped: "too-soon" };

    // O plano é montado só agora, já com tudo que foi publicado até este instante.
    const { plan, participants } = await currentPlan();
    if (participants === 0 && known.length === 0) return { ok: true, skipped: "nothing-to-say" };

    const embeds = buildEmbeds(planChunks(plan), participants, new Date());
    const ids: string[] = [];
    for (let i = 0; i < embeds.length; i++) {
      const existing = known[i];
      if (existing && (await editMessage(url, existing, embeds[i]))) ids.push(existing);
      else ids.push(await postMessage(url, embeds[i]));
    }
    for (const extra of known.slice(embeds.length)) await hook(url, "DELETE", `/messages/${extra}`).catch(() => undefined);

    const { error } = await db.from("guild_discord_rounds").update({ message_ids: ids, updated_at: new Date().toISOString() }).eq("round_key", key);
    if (error) throw new Error(`Banco: ${error.message}`);

    // Limpeza das rodadas antigas (mais de 30 dias).
    void db.from("guild_discord_rounds").delete().lt("updated_at", new Date(Date.now() - 30 * 86400_000).toISOString()).then(() => undefined);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao falar com o Discord.";
    console.error("[discord]", error);
    return { ok: false, error };
  }
}
