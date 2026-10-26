import { ballTotal, type BallData } from "@/config/guildBalls";

// Só roda no navegador (usa canvas e Image). Desenha o cartão do projeto, igual ao gerador de balls da guilda.

/** Ícones recortados das balls (public/guild/balls). Qualquer outra ball é desenhada à mão. */
const ICON_KEYS = ["alliance", "dusk", "fast", "heavy", "janguru", "magu", "moon", "net", "premier", "sora", "tale", "tinker", "ultra", "yume"];
const FALLBACK_COLORS: Record<string, [string, string]> = {
  ultra: ["#2d2d33", "#f2c230"], moon: ["#2f5fa0", "#f5d94a"], yume: ["#e87aa6", "#ffffff"], magu: ["#d9382f", "#ff9a2e"], fast: ["#f0b429", "#e33a2f"],
  premier: ["#f4f4f4", "#d33"], great: ["#3a7bd5", "#e33"], poke: ["#e33a2f", "#fff"], master: ["#8e44ad", "#f5d94a"], safari: ["#5a8f3c", "#e8d9a0"],
  heavy: ["#666", "#ddd"], love: ["#ff7aa8", "#fff"], net: ["#2a9d8f", "#fff"], dusk: ["#6a4c93", "#9ef"],
};

const ballKey = (name: string) => name.toLowerCase().replace(/ball/, "").trim();
const fmt = (n: number) => n.toLocaleString("pt-BR");

const cache = new Map<string, Promise<HTMLImageElement | null>>();

/** Carrega uma imagem uma única vez (devolve `null` se falhar: o desenho segue sem ela). */
function loadImage(src: string, cors = false): Promise<HTMLImageElement | null> {
  let hit = cache.get(src);
  if (!hit) {
    hit = new Promise((resolve) => {
      const img = new Image();
      if (cors) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    cache.set(src, hit);
  }
  return hit;
}

/** Arte oficial do Pokémon pela PokéAPI (precisa do número). */
export const officialArtUrl = (number: number, shiny: boolean) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${shiny ? "shiny/" : ""}${number}.png`;

export type CardAssets = { sprite: HTMLImageElement | null; icons: Map<string, HTMLImageElement> };

/** Busca a arte do Pokémon (a enviada à mão ganha da oficial) e os ícones das balls usadas. */
export async function loadCardAssets(data: BallData, customSprite: string | null): Promise<CardAssets> {
  const keys = [...new Set(data.balls.map((b) => ballKey(b.name)).filter((k) => ICON_KEYS.includes(k)))];
  const [sprite, ...icons] = await Promise.all([
    customSprite ? loadImage(customSprite) : data.number ? loadImage(officialArtUrl(data.number, data.shiny), true) : Promise.resolve(null),
    ...keys.map((k) => loadImage(`/guild/balls/${k}.png`)),
  ]);
  const map = new Map<string, HTMLImageElement>();
  keys.forEach((k, i) => icons[i] && map.set(k, icons[i]!));
  return { sprite, icons: map };
}

function roundRect(x: CanvasRenderingContext2D, a: number, b: number, w: number, h: number, r: number) {
  x.beginPath();
  x.roundRect(a, b, w, h, r);
}

function drawBall(x: CanvasRenderingContext2D, icons: Map<string, HTMLImageElement>, cx: number, cy: number, r: number, name: string) {
  const key = ballKey(name);
  const icon = icons.get(key);
  if (icon) {
    x.save();
    x.shadowColor = "rgba(0,0,0,.5)";
    x.shadowBlur = 10;
    x.shadowOffsetY = 3;
    const pg = x.createRadialGradient(cx, cy - r * 0.3, 2, cx, cy, r + 5);
    pg.addColorStop(0, "#2a3556");
    pg.addColorStop(1, "#10172b");
    x.fillStyle = pg;
    x.beginPath();
    x.arc(cx, cy, r + 5, 0, 7);
    x.fill();
    x.restore();
    x.strokeStyle = "rgba(255,255,255,.2)";
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(cx, cy, r + 5, 0, 7);
    x.stroke();
    x.save();
    x.beginPath();
    x.arc(cx, cy, r + 1, 0, 7);
    x.clip();
    x.drawImage(icon, cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2);
    x.restore();
    return;
  }
  // Ball sem ícone: desenho simples com as cores conhecidas (ou cinza).
  const c = FALLBACK_COLORS[key] ?? ["#8a93a3", "#fff"];
  x.save();
  x.shadowColor = "rgba(0,0,0,.45)";
  x.shadowBlur = 8;
  x.shadowOffsetY = 3;
  x.fillStyle = "#f3f3f3";
  x.beginPath();
  x.arc(cx, cy, r, 0, 7);
  x.fill();
  x.restore();
  x.fillStyle = c[0];
  x.beginPath();
  x.arc(cx, cy, r, Math.PI, 0);
  x.fill();
  x.fillStyle = "#1a1a1f";
  x.fillRect(cx - r, cy - r * 0.1, r * 2, r * 0.2);
  x.strokeStyle = "#1a1a1f";
  x.lineWidth = 2;
  x.beginPath();
  x.arc(cx, cy, r, 0, 7);
  x.stroke();
  x.fillStyle = "#1a1a1f";
  x.beginPath();
  x.arc(cx, cy, r * 0.32, 0, 7);
  x.fill();
  x.fillStyle = c[1];
  x.beginPath();
  x.arc(cx, cy, r * 0.2, 0, 7);
  x.fill();
}

/** Desenha o cartão do projeto (920 px de largura, em dobro de resolução). */
export function drawBallCard(data: BallData, assets: CardAssets, target?: HTMLCanvasElement): HTMLCanvasElement {
  const S = 2, W = 920, P = 30, cols = 4, gap = 14, th = 104;
  const tw = (W - P * 2 - gap * 3) / 4;
  const total = ballTotal(data.balls);
  const rows = Math.ceil(data.balls.length / cols);
  const H = 210 + rows * (th + gap) + P - gap;
  const max = Math.max(0, ...data.balls.map((b) => b.qty));

  const c = target ?? document.createElement("canvas");
  c.width = W * S;
  c.height = H * S;
  const x = c.getContext("2d")!;
  x.setTransform(S, 0, 0, S, 0, 0);
  x.clearRect(0, 0, W, H);

  const bg = x.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0d1426");
  bg.addColorStop(1, "#22305a");
  x.fillStyle = bg;
  roundRect(x, 0, 0, W, H, 22);
  x.fill();

  const glow = x.createRadialGradient(150, 105, 10, 150, 105, 170);
  glow.addColorStop(0, data.shiny ? "rgba(255,215,90,.38)" : "rgba(120,160,255,.32)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = glow;
  x.fillRect(0, 0, 380, 230);

  const { sprite } = assets;
  if (sprite) {
    const k = Math.min(170 / sprite.width, 170 / sprite.height);
    x.drawImage(sprite, 150 - (sprite.width * k) / 2, 105 - (sprite.height * k) / 2, sprite.width * k, sprite.height * k);
  } else {
    x.fillStyle = "rgba(255,255,255,.1)";
    x.beginPath();
    x.arc(150, 105, 70, 0, 7);
    x.fill();
  }

  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  x.fillStyle = "#fff";
  x.font = "800 44px system-ui,sans-serif";
  x.fillText(data.pokemon, 270, 100, 380);
  x.fillStyle = "#9fb0d6";
  x.font = "600 22px system-ui,sans-serif";
  if (data.number) x.fillText(`#${data.number}`, 272, 134);
  if (data.shiny) {
    x.fillStyle = "#f5c542";
    roundRect(x, 272, 150, 96, 30, 15);
    x.fill();
    x.fillStyle = "#3a2a00";
    x.font = "800 15px system-ui,sans-serif";
    x.fillText("✦ SHINY", 286, 171);
  }

  x.textAlign = "right";
  x.fillStyle = "#9fb0d6";
  x.font = "700 15px system-ui,sans-serif";
  x.fillText("TOTAL DE BALLS", W - P, 70);
  x.fillStyle = "#fff";
  x.font = "800 54px system-ui,sans-serif";
  x.fillText(fmt(total), W - P, 124);
  x.fillStyle = "rgba(255,255,255,.12)";
  x.fillRect(P, 196, W - P * 2, 1.5);

  data.balls.forEach((b, i) => {
    const x0 = P + (i % cols) * (tw + gap);
    const y0 = 210 + Math.floor(i / cols) * (th + gap);
    const top = b.qty === max && max > 0;
    x.fillStyle = "rgba(255,255,255,.06)";
    roundRect(x, x0, y0, tw, th, 16);
    x.fill();
    x.strokeStyle = top ? "#f5c542" : "rgba(255,255,255,.12)";
    x.lineWidth = top ? 2 : 1;
    roundRect(x, x0, y0, tw, th, 16);
    x.stroke();
    drawBall(x, assets.icons, x0 + 42, y0 + th / 2, 25, b.name);
    x.textAlign = "left";
    x.fillStyle = "#fff";
    x.font = "800 28px system-ui,sans-serif";
    x.fillText(fmt(b.qty), x0 + 78, y0 + 52, tw - 88);
    x.fillStyle = "#9fb0d6";
    x.font = "600 14px system-ui,sans-serif";
    x.fillText(`${b.name.replace(/ball/i, "").trim()} Ball`, x0 + 78, y0 + 76, tw - 88);
  });
  return c;
}

/** O cartão como arquivo PNG (é o que vai para o Discord). */
export const canvasToPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/png"));

/** Reduz uma imagem enviada à mão para no máximo 256 px e devolve como data URL PNG (cabe no banco). */
export async function shrinkSprite(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (!img) throw new Error("Não consegui ler essa imagem.");
    const k = Math.min(1, 256 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
