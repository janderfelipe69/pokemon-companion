/** Missão de clones da guilda: dificuldades, tamanho do time e regras. Para mudar níveis ou textos, altere só aqui. */
export const CLONE_DIFFICULTIES = [
  { key: "easy", label: "Easy", level: 150 },
  { key: "medium", label: "Medium", level: 300 },
  { key: "hard", label: "Hard", level: 420 },
] as const;

export type CloneDifficultyKey = (typeof CLONE_DIFFICULTIES)[number]["key"];

export const isCloneDifficulty = (value: unknown): value is CloneDifficultyKey =>
  typeof value === "string" && CLONE_DIFFICULTIES.some((d) => d.key === value);

export const cloneDifficulty = (key: CloneDifficultyKey) => CLONE_DIFFICULTIES.find((d) => d.key === key)!;

/** Quantos jogadores fecham um time (o líder conta). */
export const CLONE_TEAM_SIZE = 4;
/** Tamanho máximo do recado de horário que o líder pode deixar. */
export const CLONE_NOTE_MAX = 80;
export const CLONE_RESET_TEXT = "todo dia 1º, à meia-noite (horário de Brasília)";

/** Um time como a tela e a API enxergam. */
export type CloneTeam = {
  id: number;
  difficulty: CloneDifficultyKey;
  leader: string;
  note: string | null;
  createdAt: string;
  members: string[];
  full: boolean;
};
