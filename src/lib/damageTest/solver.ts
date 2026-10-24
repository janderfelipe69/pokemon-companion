import { round1 } from "./format";
import { HAZARDS, requiredDamage } from "./hazards";

/** Pokémon já validado: tem nome e dano maior que zero. `dmg` em k, sem o bônus das runas. */
export type Mon = { id: string | null; name: string; dmg: number; lure: boolean };

export type Mode = {
  id: "3x3" | "2x2x2";
  label: string;
  /** Pokémon por time. */
  size: number;
  /** Quantidade de times. */
  groups: number;
  unit: "Time" | "Dupla";
};

export const MODES: readonly Mode[] = [
  { id: "3x3", label: "3x3", size: 3, groups: 2, unit: "Time" },
  { id: "2x2x2", label: "2x2x2", size: 2, groups: 3, unit: "Dupla" },
];

export type TeamPlan = { members: Mon[]; total: number };

/** Divisão em que todos os times batem o dano exigido. */
export type Plan = { teams: TeamPlan[]; spread: number; minMargin: number };

/** Melhor tentativa quando nenhuma divisão fecha: o pior time faz `worst`. */
export type Fallback = { teams: TeamPlan[]; worst: number; spread: number };

export type Objective = "equal" | "max-min";

export type SolveOk = { ok: true; required: number; plan: Plan | null; fallback: Fallback | null; lureCount: number; runePct: number };
export type SolveError = { ok: false; kind: "count" | "lure"; message: string };
export type SolveResult = SolveOk | SolveError;

const EPS = 1e-9;
const cmp = (x: number, y: number) => (Math.abs(x - y) < EPS ? 0 : x - y);

/** `true` se `a` é uma divisão melhor que `b` para o objetivo escolhido. */
function better(a: Plan, b: Plan, objective: Objective): boolean {
  const keys: [number, number][] =
    objective === "max-min"
      ? [[b.minMargin, a.minMargin], [a.spread, b.spread]] // maior margem do pior time primeiro
      : [[a.spread, b.spread], [b.minMargin, a.minMargin]]; // times o mais parecidos possível
  for (const [x, y] of keys) {
    const c = cmp(x, y);
    if (c) return c < 0;
  }
  return false;
}

/**
 * Divide os Pokémon em times (sem repetir) de forma que todos batam `required`.
 * Regras de lure: se há lures suficientes (um por time), cada time precisa de pelo menos 1;
 * no 3x3 um time pode ter vários, no 2x2x2 cada dupla tem no máximo 1.
 */
export function solve(mons: readonly Mon[], opts: { required: number; mode: Mode; objective?: Objective; runePct?: number }): SolveResult {
  const { required, mode, objective = "equal", runePct = 0 } = opts;
  const { size: S, groups: K } = mode;
  const factor = 1 + runePct / 100;
  const req = round1(required);
  const pool = mons.map((m) => ({ ...m, dmg: round1(m.dmg * factor) }));
  const N = pool.length;

  if (N !== S * K) {
    return { ok: false, kind: "count", message: `O modo ${mode.label} usa todos os pokémons, sem repetir: precisa de exatamente ${S * K} na lista (você tem ${N}).` };
  }

  const lureCount = pool.filter((p) => p.lure).length;
  const minLures = lureCount >= K ? 1 : 0;
  const maxLures = S >= 3 ? S : 1;
  if (maxLures === 1 && lureCount > K) {
    return { ok: false, kind: "lure", message: `Você marcou ${lureCount} lures para ${K} times. Só pode 1 lure por time, então marque no máximo ${K}.` };
  }

  const assign: number[] = new Array(N).fill(0);
  const counts: number[] = new Array(K).fill(0);
  let plan: Plan | null = null;
  let fallback: Fallback | null = null;

  const evaluate = () => {
    const groups: Mon[][] = Array.from({ length: K }, () => []);
    pool.forEach((p, i) => groups[assign[i] as number]!.push(p));
    if (lureCount > 0) {
      for (const g of groups) {
        const c = g.filter((p) => p.lure).length;
        if (c < minLures || c > maxLures) return;
      }
    }
    const teams: TeamPlan[] = groups.map((members) => ({ members, total: members.reduce((a, m) => a + m.dmg, 0) }));
    const totals = teams.map((t) => t.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    if (min >= req - EPS) {
      const cand: Plan = { teams, spread: max - min, minMargin: min - req };
      if (!plan || better(cand, plan, objective)) plan = cand;
      return;
    }
    if (plan) return;
    // Entre divisões com o mesmo pior time, vale a mais equilibrada.
    if (!fallback || cmp(min, fallback.worst) > 0 || (cmp(min, fallback.worst) === 0 && cmp(max - min, fallback.spread) < 0)) {
      fallback = { teams, worst: min, spread: max - min };
    }
  };

  const rec = (i: number) => {
    if (i === N) return evaluate();
    for (let t = 0; t < K; t++) {
      if (counts[t]! < S) {
        counts[t]!++;
        assign[i] = t;
        rec(i + 1);
        counts[t]!--;
      }
    }
  };
  rec(0);

  return { ok: true, required: req, plan, fallback, lureCount, runePct };
}

/** Maior hazard que o time fecha em um modo (ou o tipo de erro que impediu a conta). */
export function highestHazard(mons: readonly Mon[], mode: Mode, runePct: number): { kind: "count" | "lure" } | { kind: "ok"; hazard: number | null } {
  let best: number | null = null;
  for (const h of HAZARDS) {
    const r = solve(mons, { required: requiredDamage(h), mode, runePct });
    if (!r.ok) return { kind: r.kind };
    if (r.plan) best = h;
  }
  return { kind: "ok", hazard: best };
}

export type HintTeam = { team: TeamPlan; missing: number; weakest: Mon | null };
/** Quando nada fecha: a melhor divisão possível e quanto falta para o hazard 0. */
export type Hint = { need: number; totalMissing: number; teams: HintTeam[] };

function buildHint(mons: readonly Mon[], mode: Mode, runePct: number): Hint | null {
  const r = solve(mons, { required: 0, mode, objective: "max-min", runePct });
  if (!r.ok || !r.plan) return null;
  const need = requiredDamage(0);
  const teams = r.plan.teams
    .map((team) => {
      const sorted = team.members.slice().sort((a, b) => b.dmg - a.dmg);
      return { team: { ...team, members: sorted }, missing: Math.max(0, need - team.total), weakest: sorted[sorted.length - 1] ?? null };
    })
    .sort((a, b) => a.missing - b.missing || b.team.total - a.team.total);
  return { need, totalMissing: teams.reduce((a, x) => a + x.missing, 0), teams };
}

export type ModeAnalysis = {
  mode: Mode;
  /** Erro específico do modo (ex.: lures demais). */
  error: string | null;
  /** Por hazard: fecha (true), não fecha (false) ou sem conta (null). */
  ok: Record<number, boolean | null>;
  /** Maior hazard que fecha; `null` = nenhum. */
  best: number | null;
  /** Resultado no maior hazard que fecha. */
  result: SolveOk | null;
  hint: Hint | null;
};

export type Analysis = { countError: string | null; modes: ModeAnalysis[] };

/** Roda todos os hazards nos dois modos (3x3 e 2x2x2) para a lista de Pokémon. */
export function analyze(mons: readonly Mon[], runePct: number): Analysis {
  const first = solve(mons, { required: 0, mode: MODES[0]!, runePct });
  if (!first.ok && first.kind === "count") return { countError: first.message, modes: [] };

  const modes = MODES.map<ModeAnalysis>((mode) => {
    const ok: Record<number, boolean | null> = {};
    let error: string | null = null;
    let best: number | null = null;
    let result: SolveOk | null = null;
    for (const h of HAZARDS) {
      const r = solve(mons, { required: requiredDamage(h), mode, runePct });
      if (!r.ok) {
        error = r.message;
        ok[h] = null;
        continue;
      }
      ok[h] = !!r.plan;
      if (r.plan) {
        best = h;
        result = r;
      }
    }
    return { mode, error, ok, best, result, hint: !error && best === null ? buildHint(mons, mode, runePct) : null };
  });
  return { countError: null, modes };
}
