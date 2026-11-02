import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDrops, listMembers, listTransfers, listWants } from "./boostData";
import { roundEnd } from "./boostRound";
import { BOOST_TYPES, STONE_TIERS, TIER_KEYS, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";
import { buildPlan, planSignature, type LeftoverStone, type PersonPlan, type TradePlan, type Transfer } from "./boostTrades";

export const WEBHOOK_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const BOT_NAME = "Boosts da Guilda";
const MAX_MESSAGES = 6;

/** A URL do webhook (segredo, só no servidor). `null` se não foi configurada ou não parece um webhook do Discord. */
const webhookUrl = (): string | null => {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  return url && WEBHOOK_RE.test(url) ? url : null;
};

export const isDiscordConfigured = () => webhookUrl() !== null;

/** Endereço público do site, para o link na mensagem (a Vercel fornece o domínio de produção sozinha). */
export function siteUrl(): string | null {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return vercel ? `https://${vercel}` : null;
}

// ── Montagem da mensagem ──────────────────────────────────────────────────────

const GOLD = 0xf2b84b;
const GRAY = 0x4f545c;
const CHUNK_LIMIT = 3500; // cada mensagem pode ter até 6000 caracteres somando os quadros; sobra espaço para o "Sobrou"
const LEFTOVER_LIMIT = 1700;
const WAITING_LIMIT = 500;
const BLUE = 0x5865f2;

/** Nick vira texto simples: sem negrito/itálico acidental. (Menções já são bloqueadas por `allowed_mentions`.) */
export const esc = (text: string) => text.replace(/([\\*_~`|>])/g, "\\$1");

const TYPE_EMOJI: Record<PokemonType, string> = {
  normal: "⚪", fire: "🔥", water: "💧", electric: "⚡", grass: "🌿", ice: "❄️", fighting: "🥊", poison: "☠️", ground: "⛰️",
  flying: "🕊️", psychic: "🔮", bug: "🐛", rock: "🪨", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "🧚",
};

const tierName = (tier: StoneTierKey) => STONE_TIERS.find((t) => t.key === tier)?.label ?? tier;
/** Advanced e Potent saem em negrito: são as que a galera mais procura. */
const tierText = (tier: StoneTierKey) => (tier === "advanced" || tier === "potent" ? `**${tierName(tier)}**` : tierName(tier));
const stoneText = (s: { type: PokemonType; tier: StoneTierKey; qty: number; done?: boolean }) => `${s.done ? "✅" : TYPE_EMOJI[s.type]} ${s.qty}x ${tierText(s.tier)} ${typeInfo[s.type].label}`;

/** "📥 de **Cryt**: ⛰️ 2x Advanced Ground · 🔥 …" — uma linha por pessoa do outro lado da troca, as stones mais fortes primeiro. */
function transferLines(list: readonly Transfer[], side: "from" | "to"): string[] {
  const others = [...new Set(list.map((t) => t[side]))];
  return others.map((name) => {
    const stones = list.filter((t) => t[side] === name).sort((a, b) => TIER_KEYS.indexOf(b.tier) - TIER_KEYS.indexOf(a.tier));
    return `${side === "from" ? "📥 de" : "📤 para"} **${esc(name)}**: ${stones.map(stoneText).join(" · ")}`;
  });
}

/** Um bloco por pessoa que tem troca: o que ela recebe e o que ela entrega. */
function personBlock(person: PersonPlan): string[] {
  return [`**${esc(person.name)}**`, ...transferLines(person.gets, "from"), ...transferLines(person.gives, "to")];
}

/** "Sobrou": uma linha por dono, agrupada por tipo, da stone mais forte para a mais fraca. */
function leftoverDescription(leftover: readonly LeftoverStone[]): string {
  const owners = [...new Set(leftover.map((l) => l.owner))];
  const lines = owners.map((owner) => {
    const mine = leftover.filter((l) => l.owner === owner);
    const types = BOOST_TYPES.filter((t) => mine.some((l) => l.type === t));
    const parts = types.map((type) => {
      const tiers = mine.filter((l) => l.type === type).sort((a, b) => TIER_KEYS.indexOf(b.tier) - TIER_KEYS.indexOf(a.tier));
      return `${TYPE_EMOJI[type]} ${typeInfo[type].label} (${tiers.map((l) => `${l.qty}x ${tierName(l.tier)}`).join(", ")})`;
    });
    return `**${esc(owner)}**: ${parts.join(" · ")}`;
  });

  const kept: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length + 1 > LEFTOVER_LIMIT) break;
    kept.push(line);
    size += line.length + 1;
  }
  if (kept.length < lines.length) kept.push(`… e mais ${lines.length - kept.length} ${lines.length - kept.length === 1 ? "pessoa" : "pessoas"} com sobras.`);
  return kept.join("\n");
}

/** Só os nomes de quem quer stones e ainda não publicou, cortando com "… e mais N" se passar do limite. */
function waitingDescription(names: readonly string[]): string {
  const kept: string[] = [];
  let size = 0;
  for (const name of names) {
    const part = esc(name);
    if (size + part.length + 2 > WAITING_LIMIT) break;
    kept.push(part);
    size += part.length + 2;
  }
  const rest = names.length - kept.length;
  return `${kept.join(", ")}${rest > 0 ? ` … e mais ${rest}` : ""}\n*Quando publicarem, o plano se refaz.*`;
}

/** O plano em partes de no máximo ~3500 caracteres, sempre quebrando entre pessoas (ou entre linhas, se uma pessoa sozinha passar do limite). */
export function planChunks(plan: TradePlan): string[] {
  const traders = plan.people.filter((p) => p.gives.length > 0 || p.gets.length > 0);
  const moved = plan.transfers.reduce((n, t) => n + t.qty, 0);

  const blocks: string[][] = [];
  if (plan.people.length === 0) blocks.push(["Ninguém publicou drops nesta rodada."]);
  else {
    const done = plan.transfers.filter((t) => t.done).reduce((n, t) => n + t.qty, 0);
    blocks.push([`**${plan.people.length}** ${plan.people.length === 1 ? "pessoa publicou" : "pessoas publicaram"} · **${moved}** ${moved === 1 ? "stone" : "stones"} a repassar${done > 0 ? ` · ✅ **${done}** já ${done === 1 ? "trocada" : "trocadas"}` : ""}`]);
    if (traders.length === 0) blocks.push(["Nenhuma troca por enquanto."]);
  }
  blocks.push(...traders.map(personBlock));

  const idle = plan.people.filter((p) => p.gives.length === 0 && p.gets.length === 0).map((p) => esc(p.name));
  if (idle.length > 0 && plan.people.length > 0) blocks.push([`*Sem trocas:* ${idle.join(", ")}`]);

  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  const flush = () => {
    if (current.length > 0) chunks.push(current.join("\n"));
    current = [];
    size = 0;
  };
  for (const block of blocks) {
    const blockSize = block.reduce((n, line) => n + line.length + 1, 0);
    if (size > 0 && blockSize <= CHUNK_LIMIT && size + blockSize + 1 > CHUNK_LIMIT) flush(); // bloco enorme não deixa o cabeçalho sozinho; é quebrado por linhas abaixo
    for (const line of block) {
      if (size + line.length + 1 > CHUNK_LIMIT) flush(); // pessoa gigante: quebra entre linhas
      current.push(line.slice(0, CHUNK_LIMIT));
      size += line.length + 1;
    }
    current.push(""); // linha em branco entre pessoas
    size += 1;
  }
  flush();
  const trimmed = chunks.map((c) => c.trim()).filter(Boolean);
  if (trimmed.length <= MAX_MESSAGES) return trimmed;
  const kept = trimmed.slice(0, MAX_MESSAGES);
  kept[MAX_MESSAGES - 1] += "\n\n*… o plano completo está no site.*";
  return kept;
}

/** Cada item é uma mensagem do Discord (lista de quadros). O quadro cinza do "Sobrou" vai junto da última. */
export function buildMessages(plan: TradePlan, updatedAt: Date, waiting: readonly string[] = []): object[][] {
  const chunks = planChunks(plan);
  const link = siteUrl();
  const timestamp = updatedAt.toISOString(); // o Discord mostra no horário de quem está vendo
  const messages: object[][] = chunks.map((description, i) => [
    {
      ...(i === 0 ? { title: "📦 Plano de trocas do boss", ...(link ? { url: link } : {}) } : {}),
      description,
      color: GOLD,
      ...(chunks.length > 1 ? { footer: { text: `parte ${i + 1}/${chunks.length}` } } : {}),
      timestamp,
    },
  ]);
  const last = messages[messages.length - 1];
  if (plan.leftover.length > 0) last.push({ title: "Sobrou — ninguém que publicou quer", description: leftoverDescription(plan.leftover), color: GRAY });
  if (waiting.length > 0 && plan.people.length > 0) last.push({ title: `⏳ Ainda não publicaram (${waiting.length})`, description: waitingDescription(waiting), color: BLUE });
  return messages;
}

// ── Chamadas ao Discord ───────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Chama o webhook; se o Discord pedir para esperar (429), espera um pouco e tenta mais uma vez. */
export async function hook(url: string, method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<Response> {
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

export async function postMessage(url: string, embeds: object[], username: string = BOT_NAME): Promise<string> {
  const response = await hook(url, "POST", "?wait=true", { username, embeds, allowed_mentions: { parse: [] } });
  if (!response.ok) throw new Error(`Discord recusou a mensagem (${response.status}).`);
  const data = (await response.json().catch(() => ({}))) as { id?: string };
  if (!data.id) throw new Error("O Discord não devolveu o id da mensagem.");
  return data.id;
}

/** Edita uma mensagem; devolve `false` se ela não existe mais (alguém apagou no Discord). */
export async function editMessage(url: string, id: string, embeds: object[]): Promise<boolean> {
  const response = await hook(url, "PATCH", `/messages/${id}`, { embeds, allowed_mentions: { parse: [] } });
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

async function currentPlan(): Promise<{ plan: TradePlan; participants: number; waiting: string[] }> {
  const members = await listMembers();
  const [wants, drops, transfers] = await Promise.all([listWants(), listDrops(), listTransfers(members)]);
  const byId = new Map(members.map((m) => [m.id, m.name]));
  const participants = drops
    .filter((d) => byId.has(d.memberId))
    .map((d) => ({ name: byId.get(d.memberId)!, stones: d.stones, wants: wants.get(d.memberId) ?? [] }));
  const posted = new Set(participants.map((p) => p.name));
  const waiting = members
    .filter((m) => !posted.has(m.name) && (wants.get(m.id)?.length ?? 0) > 0)
    .map((m) => m.name)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { plan: buildPlan(participants, transfers), participants: participants.length, waiting };
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

    // O plano é montado só agora, já com tudo que foi publicado até este instante. Se mais alguém publicar enquanto
    // a mensagem está sendo editada, refaz (até 3 vezes): assim uma edição atrasada nunca deixa o Discord com plano velho.
    let ids = known;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { plan, participants, waiting } = await currentPlan();
      if (participants === 0 && ids.length === 0) return { ok: true, skipped: "nothing-to-say" };
      const version = planSignature(plan) + waiting.join("|");

      const messages = buildMessages(plan, new Date(), waiting);
      const next: string[] = [];
      for (let i = 0; i < messages.length; i++) {
        const existing = ids[i];
        if (existing && (await editMessage(url, existing, messages[i]))) next.push(existing);
        else next.push(await postMessage(url, messages[i]));
      }
      for (const extra of ids.slice(messages.length)) await hook(url, "DELETE", `/messages/${extra}`).catch(() => undefined);
      ids = next;

      const { error } = await db.from("guild_discord_rounds").update({ message_ids: ids, updated_at: new Date().toISOString() }).eq("round_key", key);
      if (error) throw new Error(`Banco: ${error.message}`);

      const after = await currentPlan();
      if (planSignature(after.plan) + after.waiting.join("|") === version) break;
    }

    // Limpeza das rodadas antigas (mais de 30 dias).
    void db.from("guild_discord_rounds").delete().lt("updated_at", new Date(Date.now() - 30 * 86400_000).toISOString()).then(() => undefined);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao falar com o Discord.";
    console.error("[discord]", error);
    return { ok: false, error };
  }
}
