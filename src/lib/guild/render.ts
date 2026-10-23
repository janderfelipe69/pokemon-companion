import { GUILD_RULES, type Board, type BoardRow } from "./board";

/**
 * Desenha a imagem de progresso semanal da guilda num <canvas>.
 * É a versão para o navegador do script `generate_image.py` da skill daylis-guild:
 * mesmas medidas, cores e regras. Tudo é mostrado em PONTOS (nenhum valor de saldo).
 *
 * As coordenadas são "lógicas" (1040 px de largura). Quem chama pode aplicar
 * ctx.scale(2, 2) para uma imagem mais nítida.
 */

export const BOARD_WIDTH = 1040;

const FONT = '"DejaVu Sans", Verdana, "Segoe UI", Arial, sans-serif';
/** Altura da linha de base em relação ao topo do texto (DejaVu Sans). */
const ASCENT = 0.928;

const rgb = (r: number, g: number, b: number) => `rgb(${r}, ${g}, ${b})`;
const BG = rgb(21, 19, 15);
const SURFACE = rgb(28, 26, 21);
const SURFACE_ALT = rgb(33, 30, 24);
const BORDER = rgb(51, 47, 38);
const TEXT_PRIMARY = rgb(244, 241, 234);
const TEXT_SECOND = rgb(201, 196, 182);
const TEXT_MUTED = rgb(143, 138, 122);
const TEAL = rgb(43, 189, 141);
const AMBER = rgb(217, 154, 53);
const GOLD = rgb(191, 140, 33);
const RISK = rgb(219, 92, 68);
const TEAL_BG = rgb(24, 43, 37);
const AMBER_BG = rgb(44, 34, 20);
const GOLD_BG = rgb(42, 34, 17);
const GOLD_BRIGHT = rgb(240, 190, 60);
const VIOLET = rgb(167, 139, 250);
const VIOLET_BG = rgb(33, 28, 50);
const GREEN_DOT = rgb(124, 195, 74);
const GRAY_DOT = rgb(120, 116, 105);

// ---- medidas ----
const W = BOARD_WIDTH;
const margin = 30;
const rowH = 34;
const sectionHeadH = 34;
const headerH = 118;
const summaryH = 90;
const spotlightH = 140;
const legendH = 52;
const tableHeadH = 30;
const footerH = 40;
const noteH = 22;

export function boardHeight(board: Board): number {
  const sectionsH = board.sections.reduce((sum, s) => sum + sectionHeadH + s.members.length * rowH, 0);
  const departedH = board.departed.length ? noteH : 0;
  const joinedH = board.joined.length ? noteH : 0;
  return headerH + summaryH + spotlightH + legendH + tableHeadH + sectionsH + footerH + departedH + joinedH;
}

// ---- textos ----
const R = GUILD_RULES;
const TEXT = {
  title: "Progresso semanal (pontos + doações)",
  rules: `Meta semanal: ${R.goal} pontos (daily normal 1, wildscape 2, primal 4)  |  ${R.balancePerPoint} de saldo de doação = 1 ponto`,
  penalty: "Não bateu a meta? 100k por ponto restante. Boss da guilda domingo às 21:30.",
  legend: "Números = pontos | cima = pontos das diárias, baixo = pontos das doações",
  highlight: `${R.dailyWeekMax} pontos = destaque`,
  progress: `Progresso (cima: /${R.dailyWeekMax} | baixo: /${R.donationWeekPts})`,
  footer: `Barras: diárias na escala de ${R.dailyWeekMax} pontos, doações na de ${R.donationWeekPts} pontos (máx. semanal). Meta ${R.goal}: vermelhas até bater, verdes depois.`,
};

type Ctx = CanvasRenderingContext2D;

class Painter {
  constructor(private ctx: Ctx) {}

  private setFont(size: number, bold: boolean) {
    this.ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  }

  width(text: string, size: number, bold = false): number {
    this.setFont(size, bold);
    return this.ctx.measureText(text).width;
  }

  /** (x, y) é o canto superior esquerdo do texto. */
  text(x: number, y: number, text: string, size: number, color: string, bold = false) {
    this.setFont(size, bold);
    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "left";
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y + size * ASCENT);
  }

  /** Corta o texto com "…" se passar de maxWidth. */
  fit(text: string, size: number, maxWidth: number, bold = false): string {
    if (this.width(text, size, bold) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && this.width(`${t}…`, size, bold) > maxWidth) t = t.slice(0, -1);
    return `${t}…`;
  }

  rect(x: number, y: number, w: number, h: number, fill: string) {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(x, y, w, h);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0 + 0.5);
    this.ctx.lineTo(x1, y1 + 0.5);
    this.ctx.stroke();
  }

  private roundPath(x: number, y: number, w: number, h: number, r: number) {
    const c = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  rrect(x: number, y: number, w: number, h: number, r: number, fill: string, outline?: string, outlineWidth = 1) {
    this.roundPath(x, y, w, h, r);
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    if (outline) {
      const inset = outlineWidth / 2;
      this.roundPath(x + inset, y + inset, w - outlineWidth, h - outlineWidth, Math.max(0, r - inset));
      this.ctx.strokeStyle = outline;
      this.ctx.lineWidth = outlineWidth;
      this.ctx.stroke();
    }
  }

  circle(cx: number, cy: number, r: number, fill: string, outline?: string, outlineWidth = 1) {
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    if (outline) {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r - outlineWidth / 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = outline;
      this.ctx.lineWidth = outlineWidth;
      this.ctx.stroke();
    }
  }
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => Array.from(w)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function drawBoard(ctx: Ctx, board: Board, emblem: CanvasImageSource | null = null): void {
  const p = new Painter(ctx);
  const H = boardHeight(board);
  const { totals } = board;

  p.rect(0, 0, W, H, BG);

  // ---- cabeçalho ----
  p.text(margin, 20, board.guildName, 13, GOLD, true);
  p.text(margin, 40, TEXT.title, 24, TEXT_PRIMARY, true);
  p.text(margin, 72, TEXT.rules, 13, TEXT_SECOND);
  p.text(margin, 92, TEXT.penalty, 13, TEXT_SECOND);
  if (emblem) ctx.drawImage(emblem, W - margin - 60, 25, 60, 60);

  // ---- barra de resumo (tudo em pontos) ----
  const sumY0 = headerH;
  const sumY1 = sumY0 + summaryH - 16;
  p.rrect(margin, sumY0, W - margin * 2, sumY1 - sumY0, 14, SURFACE, BORDER);
  const stats: [string, string, string][] = [
    ["TOTAL PONTOS", String(totals.points), TEAL],
    ["PONTOS DAS DOAÇÕES", String(totals.donations), AMBER],
    ["TOTAL DA GUILDA", String(totals.guild), VIOLET],
    ["PROGRESSO MÉDIO", `${totals.avgPct}%`, GOLD],
    ["MEMBROS EM RISCO", String(totals.risk), RISK],
  ];
  const statW = (W - margin * 2) / stats.length;
  stats.forEach(([label, value, color], i) => {
    const sx = margin + i * statW;
    const cx = sx + statW / 2;
    p.text(cx - p.width(value, 22, true) / 2, sumY0 + 18, value, 22, color, true);
    p.text(cx - p.width(label, 11) / 2, sumY0 + 48, label, 11, TEXT_MUTED);
    if (i > 0) p.line(sx, sumY0 + 16, sx, sumY1 - 16, BORDER);
  });

  // ---- cards de destaque ----
  const spotY0 = sumY1 + 18;
  const spotY1 = spotY0 + spotlightH - 16;
  const gap = 16;
  const cardW = (W - margin * 2 - gap * 3) / 4;

  const spotlight = (x0: number, title: string, accent: string, accentBg: string, member: BoardRow, valueLabel: string, value: string | number) => {
    const x1 = x0 + cardW;
    p.rrect(x0, spotY0, cardW, spotY1 - spotY0, 14, accentBg, accent);
    p.text(x0 + 18, spotY0 + 14, title, 12, accent, true);
    const acR = 22;
    const acCx = x0 + 18 + acR;
    const acCy = spotY0 + 58;
    p.circle(acCx, acCy, acR, SURFACE, accent, 2);
    const initials = initialsOf(member.name);
    p.text(acCx - p.width(initials, 17, true) / 2, acCy - 11, initials, 17, accent, true);
    const nameX = acCx + acR + 12;
    const avail = x1 - 12 - nameX;
    let fsize = 17;
    while (p.width(member.name, fsize, true) > avail && fsize > 10) fsize -= 1;
    p.text(nameX, acCy - 20 + Math.floor((17 - fsize) / 2), member.name, fsize, TEXT_PRIMARY, true);
    p.text(nameX, acCy + 2, `${valueLabel}: ${value}`, 13, TEXT_SECOND);
  };
  spotlight(margin, "TOP NÍVEL", GOLD, GOLD_BG, board.topLevel, "Nível", board.topLevel.level);
  spotlight(margin + (cardW + gap), "TOP PONTOS", TEAL, TEAL_BG, board.topPoints, "Pontos", board.topPoints.points);
  spotlight(margin + (cardW + gap) * 2, "TOP DOAÇÕES", AMBER, AMBER_BG, board.topDonations, "Doações", board.topDonations.donations);
  spotlight(margin + (cardW + gap) * 3, "TOP TOTAL (MEMBROS)", VIOLET, VIOLET_BG, board.topTotal, "Pontos", board.topTotal.total);

  // ---- legenda ----
  const ly = spotY1 + 20;
  p.rect(margin, ly, 12, 12, RISK);
  p.text(margin + 18, ly - 2, "Meta não batida", 12, TEXT_SECOND);
  p.rect(margin + 130, ly, 12, 12, TEAL);
  p.text(margin + 148, ly - 2, "Meta batida", 12, TEXT_SECOND);
  p.text(margin + 250, ly - 2, TEXT.legend, 12, TEXT_SECOND);
  p.rect(margin + 818, ly, 12, 12, GOLD_BRIGHT);
  p.text(margin + 836, ly - 2, TEXT.highlight, 12, TEXT_SECOND);
  p.circle(margin + 704, ly + 24, 4, GREEN_DOT);
  p.text(margin + 716, ly + 16, "Online", 12, TEXT_SECOND);
  p.circle(margin + 782, ly + 24, 4, GRAY_DOT);
  p.text(margin + 794, ly + 16, "Offline", 12, TEXT_SECOND);
  p.text(margin, ly + 18, `Nome vermelho = abaixo de ${GUILD_RULES.riskThreshold}% da meta`, 12, RISK);
  p.text(margin + 330, ly + 18, board.hasPrevious ? "Lvl (+/-N) = nível atual e variação desde a exportação anterior" : "Lvl = nível atual", 12, TEXT_MUTED);

  // ---- colunas da tabela ----
  const xAvatar = margin;
  const xName = xAvatar + 44;
  const nameW = 226;
  const cntW = 60;
  const xCd = xName + nameW + 8;
  const xCdon = xCd + cntW;
  const xCtot = xCdon + cntW;
  const xBar = xCtot + cntW + 8;
  const metaW = 80;
  const barW = W - margin - xBar - metaW - 12;
  const xMeta = xBar + barW + 16;

  const hy = ly + 46;
  (
    [
      [xCd, "Pontos"],
      [xCdon, "Doações"],
      [xCtot, "Total"],
    ] as [number, string][]
  ).forEach(([hx, label]) => p.text(hx + cntW - 6 - p.width(label, 12), hy, label, 12, TEXT_MUTED));
  p.text(xBar, hy, TEXT.progress, 12, TEXT_MUTED);
  p.text(xMeta, hy, "Meta", 12, TEXT_MUTED);

  // ---- linhas ----
  let y = hy + 20;
  for (const section of board.sections) {
    p.rect(margin, y, W - margin * 2, sectionHeadH - 6, SURFACE_ALT);
    p.text(margin + 12, y + 8, `${section.tier.toUpperCase()} (${section.members.length})`, 13, GOLD, true);
    y += sectionHeadH;

    section.members.forEach((r, idx) => {
      const cy = y + rowH / 2;
      if (idx % 2 === 1) p.rect(margin, y, W - margin * 2, rowH, SURFACE);

      const max = r.maxPoints;
      if (max) {
        // destaque: degradê dourado, forte à esquerda
        const grad = ctx.createLinearGradient(margin, 0, W - margin, 0);
        grad.addColorStop(0, rgb(100, 74, 14));
        grad.addColorStop(1, rgb(38, 32, 16));
        ctx.fillStyle = grad;
        ctx.fillRect(margin, y, W - margin * 2, rowH);
      }
      p.line(margin, y + rowH, W - margin, y + rowH, max ? GOLD_BRIGHT : BORDER);
      if (max) {
        p.line(margin, y, W - margin, y, GOLD_BRIGHT);
        p.rect(margin, y, 5, rowH, GOLD_BRIGHT);
      }

      // avatar
      const off = max ? 3 : 0;
      p.circle(xAvatar + off + 16, cy, 16, SURFACE_ALT, max ? GOLD_BRIGHT : BORDER, max ? 2 : 1);
      const initials = initialsOf(r.name);
      p.text(xAvatar + off + 16 - p.width(initials, 11) / 2, cy - 6, initials, 11, max ? GOLD_BRIGHT : TEXT_SECOND);

      // status
      p.circle(xName + 4, cy - 7, 4, r.status === "online" ? GREEN_DOT : GRAY_DOT);

      // nome, cargo, dias offline, nível
      const nameColor = max ? GOLD_BRIGHT : r.atRisk ? RISK : TEXT_PRIMARY;
      p.text(xName + 14, cy - 15, r.name, 14, nameColor, true);
      if (max) p.text(xName + 14 + p.width(r.name, 14, true) + 6, cy - 15, "★", 14, GOLD_BRIGHT, true);
      let rankTxt = r.rank;
      if (r.daysOffline !== null) rankTxt += `  -  há ${r.daysOffline}d`;
      p.text(xName + 14, cy + 1, rankTxt, 11, TEXT_MUTED);
      const rankW = p.width(rankTxt, 11);
      const lvlTxt = `  -  Lvl ${r.level}`;
      p.text(xName + 14 + rankW, cy + 1, lvlTxt, 11, TEXT_MUTED);
      if (r.levelDelta !== null && r.levelDelta !== 0) {
        const lvlW = p.width(lvlTxt, 11);
        const deltaTxt = r.levelDelta > 0 ? ` (+${r.levelDelta})` : ` (${r.levelDelta})`;
        p.text(xName + 14 + rankW + lvlW, cy + 1, deltaTxt, 11, r.levelDelta > 0 ? TEAL : RISK);
      }

      // quantidades: pontos | doações | total
      const counts: [number, number, boolean][] = [
        [xCd, r.points, false],
        [xCdon, r.donations, false],
        [xCtot, r.total, true],
      ];
      for (const [cx, val, bold] of counts) {
        const txt = String(val);
        let color = bold ? (r.goalHit ? TEAL : TEXT_PRIMARY) : TEXT_SECOND;
        let useBold = bold;
        if (cx === xCd && max) {
          color = GOLD_BRIGHT;
          useBold = true;
        }
        const size = useBold ? 12 : 13;
        p.text(cx + cntW - 6 - p.width(txt, size, useBold), cy - 7, txt, size, color, useBold);
      }

      // barras: cima = pontos de diárias, baixo = pontos de doações
      const barColor = r.goalHit ? TEAL : RISK;
      const bars: [number, number, string][] = [
        [cy - 10, r.points / GUILD_RULES.dailyWeekMax, max ? GOLD_BRIGHT : barColor],
        [cy + 3, r.donations / GUILD_RULES.donationWeekPts, barColor],
      ];
      for (const [by, frac, color] of bars) {
        p.rrect(xBar, by, barW, 8, 3, SURFACE_ALT, BORDER);
        const fillPx = Math.floor(barW * Math.min(1, frac));
        if (fillPx > 6) p.rrect(xBar, by, fillPx, 8, 3, color);
        else if (fillPx > 0) p.rect(xBar, by, fillPx, 8, color);
      }

      // meta
      const metaTxt = `${r.pct}%`;
      p.text(xMeta, cy - 7, metaTxt, 12, r.goalHit ? TEAL : TEXT_MUTED, true);
      if (r.goalHit) p.text(xMeta + p.width(metaTxt, 12, true) + 6, cy - 7, "OK", 12, TEAL, true);

      y += rowH;
    });
  }

  // ---- rodapé ----
  const departedH = board.departed.length ? noteH : 0;
  const joinedH = board.joined.length ? noteH : 0;
  p.text(margin, H - 28 - departedH - joinedH, TEXT.footer, 11, TEXT_MUTED);
  const maxNote = W - margin * 2;
  if (board.joined.length) {
    const t = p.fit(`Entraram na guilda desde a exportação anterior: ${board.joined.join(", ")}`, 11, maxNote);
    p.text(margin, H - 20 - departedH, t, 11, TEAL);
  }
  if (board.departed.length) {
    const t = p.fit(`Saíram da guilda desde a exportação anterior: ${board.departed.join(", ")}`, 11, maxNote);
    p.text(margin, H - 20, t, 11, RISK);
  }
}
