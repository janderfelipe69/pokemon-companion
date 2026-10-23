import type { GuildExport, GuildMemberRaw } from "./types";

const MAX_MEMBERS = 500;

function fail(message: string): never {
  throw new Error(message);
}

function num(value: unknown, field: string, who: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    fail(`Membro "${who}": o campo "${field}" precisa ser um número maior ou igual a zero.`);
  }
  return value;
}

/**
 * Valida o JSON exportado da guilda e devolve um objeto tipado.
 * Lança Error com mensagem em português quando o arquivo não tem o formato esperado.
 */
export function parseGuildExport(input: unknown): GuildExport {
  if (typeof input !== "object" || input === null) fail("O arquivo não é um JSON de guilda.");
  const doc = input as Record<string, unknown>;

  if (!Array.isArray(doc.members) || doc.members.length === 0) {
    fail('O arquivo não tem a lista "members" (ou ela está vazia).');
  }
  if (doc.members.length > MAX_MEMBERS) fail(`Membros demais no arquivo (máximo ${MAX_MEMBERS}).`);

  const members: GuildMemberRaw[] = doc.members.map((raw: unknown, i: number) => {
    if (typeof raw !== "object" || raw === null) fail(`Membro #${i + 1} inválido.`);
    const m = raw as Record<string, unknown>;
    if (typeof m.name !== "string" || m.name.trim() === "") fail(`Membro #${i + 1}: falta o nome.`);
    const name = m.name.trim();
    if (typeof m.rank !== "string") fail(`Membro "${name}": falta o campo "rank".`);
    return {
      name,
      rank: m.rank.trim(),
      level: num(m.level, "level", name),
      status: typeof m.status === "string" ? m.status.trim().toLowerCase() : "offline",
      lastLogin: typeof m.lastLogin === "string" ? m.lastLogin.trim() : "",
      points: num(m.points, "points", name),
      contribution: num(m.contribution, "contribution", name),
    };
  });

  return {
    guild: typeof doc.guild === "string" && doc.guild.trim() ? doc.guild.trim() : "Guilda",
    exportedAt: typeof doc.exportedAt === "string" ? doc.exportedAt.trim() : "",
    members,
  };
}
