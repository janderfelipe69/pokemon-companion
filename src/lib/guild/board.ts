import type { GuildExport } from "./types";

/** Regras confirmadas com o dono da guilda. Mude aqui, e só aqui. */
export const GUILD_RULES = {
  /** Meta semanal, em pontos (diárias + doações). */
  goal: 60,
  /** Máximo semanal de pontos de diárias: 42 x 4. Escala da barra e limite do destaque dourado. */
  dailyWeekMax: 168,
  /** Escala da barra de doações, em pontos (13.300 de saldo / 300). */
  donationWeekPts: 44,
  /** Cada 300 de doação (saldo) vale 1 ponto. */
  balancePerPoint: 300,
  /** Abaixo disso (% da meta) o membro aparece "em risco". */
  riskThreshold: 50,
} as const;

const RANK_LABELS: Record<string, string> = {
  "the leader": "Líder",
  "a vice-leader": "V-Líder",
  "a member": "Membro",
};
export const RANK_ORDER = ["Líder", "V-Líder", "Membro"] as const;

export type BoardRow = {
  name: string;
  rank: string;
  status: string;
  level: number;
  /** Pontos de diárias (vem pronto no JSON). */
  points: number;
  /** Saldo real doado (só usado para converter em pontos). */
  contribution: number;
  /** Pontos de doação = floor(contribution / 300). */
  donations: number;
  total: number;
  pct: number;
  daysOffline: number | null;
  atRisk: boolean;
  goalHit: boolean;
  maxPoints: boolean;
  levelDelta: number | null;
};

export type BoardSection = { tier: string; members: BoardRow[] };

export type Board = {
  guildName: string;
  exportedAt: string;
  rows: BoardRow[];
  sections: BoardSection[];
  topLevel: BoardRow;
  topPoints: BoardRow;
  topDonations: BoardRow;
  /** Maior total de pontos entre os membros (líder e vice-líderes ficam de fora). */
  topTotal: BoardRow;
  totals: { points: number; donations: number; guild: number; avgPct: number; risk: number };
  joined: string[];
  departed: string[];
  hasPrevious: boolean;
};

/** Primeiro máximo (empate fica com quem aparece antes, como o max() do Python). */
function maxBy<T>(items: T[], key: (item: T) => number): T {
  let best = items[0];
  for (const item of items) if (key(item) > key(best)) best = item;
  return best;
}

export function donationPoints(contribution: number): number {
  return Math.floor(contribution / GUILD_RULES.balancePerPoint);
}

/** "DD/MM/AAAA HH:MM:SS" -> Date (hora local). */
export function parseLastLogin(text: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = m.map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "AAAA-MM-DD HH:MM:SS" -> Date (hora local). */
export function parseExportedAt(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(text);
  if (!m) return null;
  const [, yyyy, mm, dd, hh, mi, ss] = m.map(Number);
  const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function computeBoard(current: GuildExport, previous: GuildExport | null = null): Board {
  const { goal, dailyWeekMax, riskThreshold } = GUILD_RULES;
  // Dias offline são contados a partir do momento da exportação (e não de "agora"),
  // para que uma exportação antiga continue mostrando os mesmos números.
  const reference = parseExportedAt(current.exportedAt) ?? new Date();

  const prevByName = new Map((previous?.members ?? []).map((m) => [m.name, m]));
  const currentNames = new Set(current.members.map((m) => m.name));

  const rows: BoardRow[] = current.members.map((m) => {
    const rank = RANK_LABELS[m.rank.toLowerCase()] ?? m.rank;
    const donations = donationPoints(m.contribution);
    const total = m.points + donations;
    const pct = Math.min(100, Math.round((total / goal) * 100));

    let daysOffline: number | null = null;
    if (m.status !== "online" && m.lastLogin) {
      const last = parseLastLogin(m.lastLogin);
      if (last) daysOffline = Math.max(0, Math.floor((reference.getTime() - last.getTime()) / 86_400_000));
    }

    const prev = prevByName.get(m.name);
    return {
      name: m.name,
      rank,
      status: m.status,
      level: m.level,
      points: m.points,
      contribution: m.contribution,
      donations,
      total,
      pct,
      daysOffline,
      atRisk: pct < riskThreshold,
      goalHit: pct >= 100,
      maxPoints: m.points >= dailyWeekMax,
      levelDelta: prev ? m.level - prev.level : null,
    };
  });

  // Seções por cargo: Líder, V-Líder, Membro; cargos desconhecidos viram uma seção própria no fim.
  const tiers: string[] = [...RANK_ORDER];
  for (const r of rows) if (!tiers.includes(r.rank)) tiers.push(r.rank);
  const sections: BoardSection[] = tiers
    .map((tier) => ({
      tier,
      members: rows.filter((r) => r.rank === tier).sort((a, b) => b.total - a.total),
    }))
    .filter((s) => s.members.length > 0);

  const memberPool = rows.filter((r) => r.rank !== "Líder" && r.rank !== "V-Líder");
  const pointsSum = rows.reduce((s, r) => s + r.points, 0);
  const donationsSum = rows.reduce((s, r) => s + r.donations, 0);

  return {
    guildName: current.guild.toUpperCase(),
    exportedAt: current.exportedAt,
    rows,
    sections,
    topLevel: maxBy(rows, (r) => r.level),
    topPoints: maxBy(rows, (r) => r.points),
    topDonations: maxBy(rows, (r) => r.donations),
    topTotal: maxBy(memberPool.length ? memberPool : rows, (r) => r.total),
    totals: {
      points: pointsSum,
      donations: donationsSum,
      guild: pointsSum + donationsSum,
      avgPct: Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length),
      risk: rows.filter((r) => r.atRisk).length,
    },
    joined: previous ? current.members.filter((m) => !prevByName.has(m.name)).map((m) => m.name) : [],
    departed: previous ? (previous.members.map((m) => m.name).filter((n) => !currentNames.has(n))) : [],
    hasPrevious: previous !== null,
  };
}
