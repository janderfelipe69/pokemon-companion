import type { Mon } from "./solver";

export const MAX_SLOTS = 6;
export const MAX_RUNE = 50;
const MAX_LOGS = 500;
const STORAGE_KEY = "pokemon-companion:teste-de-dano:v1";

/** Um espaço do time. `id` é o ID do Pokémon na Pokédex (`null` = vazio). */
export type Slot = {
  id: string | null;
  /** Nome na Pokédex quando foi escolhido (usado se o Pokémon sair da Pokédex). */
  name: string;
  /** Dano em k, como digitado. */
  dmg: string;
  lure: boolean;
  /** Último dano já registrado no histórico (para detectar mudanças). */
  prev: number;
};

export type DamageTeam = { name: string; slots: Slot[] };

export type DamageLog = { team: string; id: string | null; name: string; old: number | null; value: number; at: number };

export type DamageState = { teams: DamageTeam[]; cur: number; logs: DamageLog[]; rune: number };

export const blankSlot = (): Slot => ({ id: null, name: "", dmg: "", lure: false, prev: 0 });
export const blankSlots = (): Slot[] => Array.from({ length: MAX_SLOTS }, blankSlot);

export const initialState = (): DamageState => ({ teams: [{ name: "Time 1", slots: blankSlots() }], cur: 0, logs: [], rune: 0 });

export type Action =
  | { type: "hydrate"; state: DamageState }
  | { type: "pick"; slot: number; id: string; name: string }
  | { type: "dmg"; slot: number; value: string }
  | { type: "lure"; slot: number; value: boolean }
  | { type: "add-slot" }
  | { type: "remove-slot"; slot: number }
  | { type: "clear-list" }
  | { type: "select-team"; index: number }
  | { type: "rename-team"; name: string }
  | { type: "new-team" }
  | { type: "duplicate-team" }
  | { type: "delete-team" }
  | { type: "rune"; value: number }
  | { type: "commit"; at: number }
  | { type: "clear-logs" };

const clampIndex = (i: number, len: number) => Math.min(Math.max(0, i), Math.max(0, len - 1));

/** Aplica uma alteração ao time atual. */
function withTeam(state: DamageState, change: (team: DamageTeam) => DamageTeam): DamageState {
  return { ...state, teams: state.teams.map((t, i) => (i === state.cur ? change(t) : t)) };
}

const withSlot = (state: DamageState, slot: number, change: (s: Slot) => Slot) =>
  withTeam(state, (t) => ({ ...t, slots: t.slots.map((s, i) => (i === slot ? change(s) : s)) }));

export function damageReducer(state: DamageState, action: Action): DamageState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "pick":
      // Trocar o Pokémon zera o dano: o dano pertence ao Pokémon, não ao espaço.
      return withSlot(state, action.slot, (s) => (s.id === action.id ? s : { ...s, id: action.id, name: action.name, dmg: "", prev: 0 }));
    case "dmg":
      return withSlot(state, action.slot, (s) => ({ ...s, dmg: action.value }));
    case "lure":
      return withSlot(state, action.slot, (s) => ({ ...s, lure: action.value }));
    case "add-slot":
      return withTeam(state, (t) => (t.slots.length >= MAX_SLOTS ? t : { ...t, slots: [...t.slots, blankSlot()] }));
    case "remove-slot":
      return withTeam(state, (t) => ({ ...t, slots: t.slots.filter((_, i) => i !== action.slot) }));
    case "clear-list":
      return withTeam(state, (t) => ({ ...t, slots: blankSlots() }));
    case "select-team":
      return { ...state, cur: clampIndex(action.index, state.teams.length) };
    case "rename-team":
      return withTeam(state, (t) => ({ ...t, name: action.name }));
    case "new-team":
      return { ...state, teams: [...state.teams, { name: `Time ${state.teams.length + 1}`, slots: blankSlots() }], cur: state.teams.length };
    case "duplicate-team": {
      const src = state.teams[state.cur];
      if (!src) return state;
      const copy: DamageTeam = { name: `${src.name} (cópia)`, slots: src.slots.map((s) => ({ ...s })) };
      return { ...state, teams: [...state.teams, copy], cur: state.teams.length };
    }
    case "delete-team": {
      if (state.teams.length < 2) return state;
      const teams = state.teams.filter((_, i) => i !== state.cur);
      return { ...state, teams, cur: clampIndex(state.cur - 1, teams.length) };
    }
    case "rune":
      return { ...state, rune: Math.min(MAX_RUNE, Math.max(0, Number(action.value) || 0)) };
    case "commit":
      return commitLogs(state, action.at);
    case "clear-logs":
      return { ...state, logs: [] };
  }
}

/** Número digitado (aceita vírgula). `0` se vazio ou inválido. */
export const parseDmg = (value: string): number => {
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Registra no histórico os danos que mudaram desde o último registro.
 * Devolve o mesmo objeto se nada mudou (não força nova renderização).
 */
export function commitLogs(state: DamageState, at: number): DamageState {
  const added: DamageLog[] = [];
  const teams = state.teams.map((team) => ({
    ...team,
    slots: team.slots.map((s) => {
      const name = s.name.trim();
      const value = parseDmg(s.dmg);
      if (!name || value <= 0 || value === s.prev) return s;
      added.push({ team: team.name, id: s.id, name, old: s.prev || null, value, at });
      return { ...s, prev: value };
    }),
  }));
  if (added.length === 0) return state;
  return { ...state, teams, logs: [...state.logs, ...added].slice(-MAX_LOGS) };
}

/** Slots que já têm Pokémon e dano: prontos para o cálculo. */
export function toMons(slots: readonly Slot[], nameOf: (s: Slot) => string): Mon[] {
  return slots.flatMap((s) => {
    const name = nameOf(s).trim();
    const dmg = parseDmg(s.dmg);
    return name && dmg > 0 ? [{ id: s.id, name, dmg, lure: s.lure }] : [];
  });
}

export type Evolution = { name: string; first: number; last: number; gain: number; updates: number };

/** Evolução de cada Pokémon pelo histórico: dano inicial, atual e ganho (maiores ganhos primeiro). */
export function evolutionOf(logs: readonly DamageLog[]): Evolution[] {
  const byName = new Map<string, DamageLog[]>();
  for (const l of logs) byName.set(l.name, [...(byName.get(l.name) ?? []), l]);
  return [...byName.entries()]
    .map(([name, list]) => {
      const first = list[0]!.old ?? list[0]!.value;
      const last = list[list.length - 1]!.value;
      return { name, first, last, gain: last - first, updates: list.length };
    })
    .sort((a, b) => b.gain - a.gain);
}

// ---------- Salvamento no navegador ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Lê o que foi salvo, descartando qualquer coisa fora do formato (o armazenamento pode ter sido editado). */
export function parseSaved(raw: string | null): DamageState | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!isObj(data) || !Array.isArray(data.teams) || data.teams.length === 0) return null;
    const teams: DamageTeam[] = data.teams.filter(isObj).map((t, i) => {
      const slots = (Array.isArray(t.slots) ? t.slots : []).filter(isObj).slice(0, MAX_SLOTS).map((s): Slot => ({
        id: typeof s.id === "string" && s.id ? s.id : null,
        name: str(s.name),
        dmg: str(s.dmg),
        lure: s.lure === true,
        prev: num(s.prev),
      }));
      return { name: str(t.name, `Time ${i + 1}`) || `Time ${i + 1}`, slots: slots.length > 0 ? slots : blankSlots() };
    });
    if (teams.length === 0) return null;
    const logs: DamageLog[] = (Array.isArray(data.logs) ? data.logs : []).filter(isObj).flatMap((l) =>
      typeof l.name === "string" && typeof l.value === "number" && typeof l.at === "number"
        ? [{ team: str(l.team), id: typeof l.id === "string" ? l.id : null, name: l.name, old: typeof l.old === "number" ? l.old : null, value: l.value, at: l.at }]
        : [],
    );
    return { teams, cur: clampIndex(num(data.cur), teams.length), logs: logs.slice(-MAX_LOGS), rune: Math.min(MAX_RUNE, Math.max(0, num(data.rune))) };
  } catch {
    return null;
  }
}

export function loadSaved(): DamageState | null {
  try {
    return parseSaved(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** `false` se o navegador não deixou salvar (modo privado, armazenamento cheio ou bloqueado). */
export function persist(state: DamageState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, ...state }));
    return true;
  } catch {
    return false;
  }
}
