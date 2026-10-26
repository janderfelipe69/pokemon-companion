import "server-only";
import { ballTotal, type BallData } from "@/config/guildBalls";
import { esc, siteUrl, WEBHOOK_RE } from "./discord";

const BOT_NAME = "Projetos da Guilda";
const GOLD = 0xf2b84b;

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

/**
 * Posta a imagem do projeto no Discord (anexo PNG dentro do embed). Nunca lança erro:
 * se o Discord falhar, o projeto já está salvo e o resultado "failed" é só mostrado ao jogador.
 */
export async function postBallsImage(options: { data: BallData; image: Blob; by: string; previousTotal: number | null; created: boolean }): Promise<DiscordOutcome> {
  const url = webhookUrl();
  if (!url) return "off";
  const { data, image, by, previousTotal, created } = options;
  try {
    const total = ballTotal(data.balls);
    const diff = previousTotal === null ? null : total - previousTotal;
    const name = `${data.shiny ? "✦ Shiny " : ""}${data.pokemon}${data.number ? ` #${data.number}` : ""}`;
    const lines = [
      `**${fmt(total)}** balls no total${diff !== null && diff !== 0 ? ` (${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))} desde a última atualização)` : ""}`,
      `${created ? "Projeto novo, aberto" : "Atualizado"} por **${esc(by)}**`,
    ];
    const link = siteUrl();
    const embed = {
      title: `🎯 ${created ? "Novo projeto" : "Projeto atualizado"} — ${name}`,
      ...(link ? { url: `${link}/guilda/projetos` } : {}),
      description: lines.join("\n"),
      color: GOLD,
      image: { url: "attachment://projeto.png" },
      timestamp: new Date().toISOString(),
    };

    const form = new FormData();
    form.append("payload_json", JSON.stringify({ username: BOT_NAME, embeds: [embed], allowed_mentions: { parse: [] } }));
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
