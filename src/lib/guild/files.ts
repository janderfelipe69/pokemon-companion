import "server-only";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseExportedAt } from "./board";
import { parseGuildExport } from "./parse";
import type { GuildExport, GuildFileInfo } from "./types";

/** Pasta onde ficam os JSONs exportados da guilda (um por dia). */
export const GUILD_DIR = path.join(process.cwd(), "data", "guild");

const MAX_FILE_BYTES = 1_000_000;
/** Quantos arquivos (os de nome mais recente) a página lê por vez. */
const MAX_FILES = 200;

export type LoadedGuildExport = GuildFileInfo & { data: GuildExport };
export type GuildFolder = {
  /** Da exportação mais recente para a mais antiga. */
  exports: LoadedGuildExport[];
  /** Arquivos .json que não puderam ser usados, com o motivo. */
  skipped: { file: string; error: string }[];
};

export async function loadGuildFolder(): Promise<GuildFolder> {
  let names: string[];
  try {
    names = (await readdir(GUILD_DIR)).filter((n) => n.toLowerCase().endsWith(".json"));
  } catch {
    return { exports: [], skipped: [] };
  }
  names = names.sort().reverse().slice(0, MAX_FILES);

  const exports: LoadedGuildExport[] = [];
  const skipped: GuildFolder["skipped"] = [];

  for (const file of names) {
    try {
      const full = path.join(GUILD_DIR, file);
      const { size } = await stat(full);
      if (size > MAX_FILE_BYTES) throw new Error("Arquivo grande demais (máximo 1 MB).");
      const data = parseGuildExport(JSON.parse((await readFile(full, "utf8")).replace(/^\uFEFF/, "")));
      exports.push({ file, guild: data.guild, exportedAt: data.exportedAt, data });
    } catch (e) {
      skipped.push({ file, error: e instanceof SyntaxError ? "JSON inválido." : e instanceof Error ? e.message : "Erro ao ler." });
    }
  }

  exports.sort((a, b) => (a.exportedAt === b.exportedAt ? (a.file < b.file ? 1 : -1) : a.exportedAt < b.exportedAt ? 1 : -1));
  return { exports, skipped };
}

/** Nome padrão: GuildMembers_<guilda>_AAAA-MM-DD_HHMMSS.json (só letras, números, _ e -). */
export function guildFileName(data: GuildExport): string {
  const slug = data.guild.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "guilda";
  const stamp = data.exportedAt.replace(" ", "_").replace(/:/g, "").replace("T", "_");
  return `GuildMembers_${slug}_${stamp}.json`;
}

/** Grava um JSON novo na pasta. Não sobrescreve arquivo existente (lança EEXIST). */
export async function saveGuildExport(data: GuildExport): Promise<string> {
  if (!parseExportedAt(data.exportedAt)) {
    throw new Error('O arquivo precisa ter "exportedAt" no formato AAAA-MM-DD HH:MM:SS.');
  }
  const file = guildFileName(data);
  await mkdir(GUILD_DIR, { recursive: true });
  await writeFile(path.join(GUILD_DIR, file), JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  return file;
}
