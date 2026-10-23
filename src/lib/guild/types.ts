/** Um membro exatamente como vem no JSON exportado do jogo. */
export type GuildMemberRaw = {
  name: string;
  rank: string;
  level: number;
  status: string;
  lastLogin: string;
  points: number;
  contribution: number;
};

/** Arquivo exportado da guilda (um por dia). */
export type GuildExport = {
  guild: string;
  /** "AAAA-MM-DD HH:MM:SS" */
  exportedAt: string;
  members: GuildMemberRaw[];
};

export type GuildFileInfo = {
  /** Nome do arquivo dentro de data/guild. */
  file: string;
  guild: string;
  exportedAt: string;
};
