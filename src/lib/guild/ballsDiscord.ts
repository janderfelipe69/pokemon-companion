import "server-only";
import { ballTotal, shortDate, type BallData, type CaptureStats } from "@/config/guildBalls";
import { esc, siteUrl, WEBHOOK_RE } from "./discord";

const BOT_NAME = "Projetos da Guilda";
const GOLD = 0xf2b84b;
const GREEN = 0x57f287;

/** Canal dos projetos: `DISCORD_BALLS_WEBHOOK_URL` se existir; senão o mesmo canal das trocas (`DISCORD_WEBHOOK_URL`). */
function webhookUrl(): string | null {
  for (const name of ["DISCORD_BALLS_WEBHOOK_URL", "DISCORD_WEBHOOK_URL"]) {
    const url = process.env[name]?.trim();
    if (url && WEBHOOK_RE.test(url)) return url;
  }
  return null;
}

export const isBallsDiscordConfigured = () => webhookUrl() !== null;

const fmt = (n: number) => n.toLocaleString("pt-BR");

export type DiscordOutcome = "sent" | "failed" | "off";

/** Manda um embed com a imagem PNG anexada (aparece grande dentro do embed). Nunca lança erro. */
async function send(embed: Record<string, unknown>, image: Blob): Promise<DiscordOutcome> {
  const url = webhookUrl();
  if (!url) return "off";
  try {
    const form = new FormData();
    form.append("payload_json", JSON.stringify({ username: BOT_NAME, embeds: [{ ...embed, image: { url: "attachment://projeto.png" }, timestamp: new Date().toISOString() }], allowed_mentions: { parse: [] } }));
    form.append("files[0]", image, "projeto.png");
    let response = await fetch(`${url}?wait=true`, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
    if (response.status === 429) {
      const wait = Math.min(Math.ceil((((await response.json().catch(() => ({}))) as { retry_after?: number }).retry_after ?? 1) * 1000), 3000);
      await new Promise((resolve) => setTimeout(resolve, wait));
      response = await fetch(`${url}?wait=true`, { method: "POST", body: form, signal: AbortSignal.timeout(15000) });
    }
    if (!response.ok) throw new Error(`Discord recusou a imagem (${response.status}).`);
    return "sent";
  } catch (e) {
    console.error("[discord:balls]", e instanceof Error ? e.message : e);
    return "failed";
  }
}

const label = (data: BallData) => `${data.shiny ? "✦ Shiny " : ""}${data.pokemon}${data.number ? ` #${data.number}` : ""}`;

/** Posta a imagem do projeto no Discord. Se falhar, o projeto já está salvo e o resultado "failed" é só mostrado ao jogador. */
export async function postBallsImage(options: { data: BallData; image: Blob; by: string; previousTotal: number | null; created: boolean }): Promise<DiscordOutcome> {
  const { data, image, by, previousTotal, created } = options;
  const total = ballTotal(data.balls);
  const diff = previousTotal === null ? null : total - previousTotal;
  const link = siteUrl();
  return send(
    {
      title: `🎯 ${created ? "Novo projeto" : "Projeto atualizado"} — ${label(data)}`,
      ...(link ? { url: `${link}/guilda/projetos` } : {}),
      description: [`**${fmt(total)}** balls no total${diff !== null && diff !== 0 ? ` (${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))} desde a última atualização)` : ""}`, `${created ? "Projeto novo, aberto" : "Atualizado"} por **${esc(by)}**`].join("\n"),
      color: GOLD,
    },
    image,
  );
}

/** Posta a comemoração da captura: projeto encerrado, ball usada, total gasto e os números da caça. */
export async function postCaptureImage(options: { data: BallData; image: Blob; by: string; ball: string; spent: number; stats: CaptureStats | null }): Promise<DiscordOutcome> {
  const { data, image, by, ball, spent, stats } = options;
  const link = siteUrl();
  const total = ballTotal(data.balls);

  const lines = [`**${esc(by)}** capturou na **${esc(ball)}** depois de gastar **${fmt(spent)}** ${esc(ball)}s.`, `Total do projeto: **${fmt(total)}** balls.`];
  if (stats?.record) lines.push("", "🏆 **Recorde da guilda!** É o maior projeto já capturado.");
  if (stats?.lucky) lines.push("", `🍀 **Sorte grande!** Capturou com só ${fmt(total)} balls.`);

  const fields: { name: string; value: string; inline: boolean }[] = [];
  if (stats?.days) fields.push({ name: "📅 Duração", value: `${stats.days} ${stats.days === 1 ? "dia" : "dias"}${stats.startedAt ? ` (desde ${shortDate(stats.startedAt)})` : ""}`, inline: true });
  if (stats && stats.updates > 0) fields.push({ name: "🔁 Atualizações", value: String(stats.updates), inline: true });
  if (stats?.number) fields.push({ name: "🏁 Captura da guilda", value: `nº ${stats.number}`, inline: true });

  return send(
    {
      title: `🎉 Capturado! — ${label(data)}`,
      ...(link ? { url: `${link}/guilda/projetos` } : {}),
      description: lines.join("\n"),
      ...(fields.length ? { fields } : {}),
      color: GREEN,
    },
    image,
  );
}
