import "server-only";
import { CLONE_TEAM_SIZE, cloneDifficulty, type CloneDifficultyKey, type CloneTeam } from "@/config/guildClones";
import { editMessage, esc, postMessage, siteUrl, WEBHOOK_RE } from "./discord";
import { getTeam, saveMessageId } from "./cloneData";

const BOT_NAME = "Clones da Guilda";
const COLORS: Record<CloneDifficultyKey, number> = { easy: 0x43d0b4, medium: 0xf2b84b, hard: 0xe5534b };
const GREEN = 0x57f287;
const GRAY = 0x4f545c;

/**
 * Webhook dos clones. Se `DISCORD_CLONES_WEBHOOK_URL` existir, os avisos vão para aquele canal;
 * senão usa o mesmo canal das trocas (`DISCORD_WEBHOOK_URL`). `null` = sem Discord configurado.
 */
function webhookUrl(): string | null {
  for (const name of ["DISCORD_CLONES_WEBHOOK_URL", "DISCORD_WEBHOOK_URL"]) {
    const url = process.env[name]?.trim();
    if (url && WEBHOOK_RE.test(url)) return url;
  }
  return null;
}

const label = (d: CloneDifficultyKey) => `${cloneDifficulty(d).label} (lvl ${cloneDifficulty(d).level})`;

/** Embed do time: quem está dentro, quantas vagas faltam, horário combinado e link do site. Muda de cor e título quando fecha. */
function teamEmbed(team: CloneTeam, state: "open" | "full" | "cancelled"): object {
  const link = siteUrl();
  const slots = Array.from({ length: CLONE_TEAM_SIZE }, (_, i) => {
    const name = team.members[i];
    if (!name) return `${i + 1}. ▫️ *vaga aberta*`;
    return `${i + 1}. **${esc(name)}**${name === team.leader ? " 👑" : ""}`;
  });

  const lines: string[] = [];
  if (state === "cancelled") lines.push(`~~${esc(team.leader)} procurava time~~ — **time cancelado**.`);
  else if (state === "full") lines.push("**Time fechado!** Combinem o horário entre vocês.");
  else lines.push(`**${esc(team.leader)}** está procurando time para clones!`);
  if (state !== "cancelled") {
    lines.push("", `👥 **${team.members.length}/${CLONE_TEAM_SIZE}**`, ...slots);
    if (team.note) lines.push("", `🕒 ${esc(team.note)}`);
    if (state === "open" && link) lines.push("", `👉 [Entre pelo site para ocupar uma vaga](${link}/guilda/clones)`);
  }

  const title = state === "full" ? `✅ Clones ${label(team.difficulty)} — time fechado` : state === "cancelled" ? `❌ Clones ${label(team.difficulty)}` : `🧬 Clones ${label(team.difficulty)} — procurando time`;
  return {
    title,
    description: lines.join("\n"),
    color: state === "full" ? GREEN : state === "cancelled" ? GRAY : COLORS[team.difficulty],
    ...(link ? { thumbnail: { url: `${link}/guild/emblem.png` } } : {}),
    timestamp: new Date().toISOString(),
  };
}

export const isCloneDiscordConfigured = () => webhookUrl() !== null;

export type CloneEvent = { kind: "created" | "joined" | "left" | "cancelled" };

/**
 * Cria ou atualiza a mensagem do time no Discord. Nunca lança erro: se o Discord falhar, o time já está salvo
 * e quem chamou segue a vida. `cancelled` precisa do time antes de apagado (`snapshot`) e do id da mensagem.
 */
export async function syncCloneDiscord(teamId: number, event: CloneEvent, snapshot?: { team: CloneTeam; messageId: string | null }): Promise<void> {
  const url = webhookUrl();
  if (!url) return;
  try {
    if (event.kind === "cancelled") {
      if (snapshot?.messageId) await editMessage(url, snapshot.messageId, [teamEmbed(snapshot.team, "cancelled")]);
      return;
    }

    const team = await getTeam(teamId);
    if (!team) return; // o time sumiu (ficou vazio): não há o que mostrar
    const state = team.full ? "full" : "open";
    const embeds = [teamEmbed(team, state)];

    let messageId = team.messageId;
    if (!messageId || !(await editMessage(url, messageId, embeds))) {
      messageId = await postMessage(url, embeds, BOT_NAME);
      await saveMessageId(teamId, messageId);
    }

    // Editar uma mensagem não avisa ninguém: quando o time fecha, uma mensagem nova chama a atenção dos 4.
    if (event.kind === "joined" && team.full) {
      await postMessage(url, [{ description: `✅ **Time de clones ${label(team.difficulty)} fechado!**\n${team.members.map((n) => `**${esc(n)}**`).join(" · ")}\nCombinem o horário por aqui.`, color: GREEN }], BOT_NAME);
    }
  } catch (e) {
    console.error("[discord:clones]", e instanceof Error ? e.message : e);
  }
}
