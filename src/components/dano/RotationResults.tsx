import { CircleCheck, CircleX, Lightbulb, Minus, Shield, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fmtK, fmtNum, fmtSignedK } from "@/lib/damageTest/format";
import {
  dropsFor, effectsOf, ESTIMATED_HAZARDS, HAZARDS, precisionFor, requiredDamage,
} from "@/lib/damageTest/hazards";
import { MODES, pokebarOrder, type Analysis, type Hint, type ModeAnalysis, type Plan } from "@/lib/damageTest/solver";
import type { DexOption } from "@/lib/damageTest/search";
import { PokemonThumb } from "./PokemonThumb";
import { badText, okText, td, th } from "./ui";

export type CompareCell = { kind: "count" | "lure" } | { kind: "ok"; hazard: number | null };
export type CompareRow = { name: string; current: boolean; cells: CompareCell[] };
export type RotationResult = { analysis: Analysis; compare: CompareRow[] | null };

type Lookup = (id: string | null) => DexOption | null;

function StatusIcon({ value }: { value: boolean | null }) {
  if (value === null) return <Minus className="mx-auto size-4 text-muted" aria-label="Sem conta" />;
  return value ? (
    <CircleCheck className={`mx-auto size-4 ${okText}`} aria-label="Fecha" />
  ) : (
    <CircleX className={`mx-auto size-4 ${badText}`} aria-label="Não fecha" />
  );
}

function TeamCard({ index, total, required, members, lookup }: { index: number; total: number; required: number; members: Plan["teams"][number]["members"]; lookup: Lookup }) {
  const margin = total - required;
  return (
    <Card className="border-l-4 border-l-gold">
      <h3 className="mb-2 font-semibold">
        Rotação {index + 1} — {fmtK(total)}{" "}
        <span className={margin >= 0 ? okText : badText}>({fmtSignedK(margin)})</span>
      </h3>
      <ul>
        {pokebarOrder(members).map((m, i) => (
          <li key={`${m.id ?? m.name}-${i}`} className="flex items-center gap-3 border-b border-dashed border-line py-1.5 last:border-0">
            <PokemonThumb src={lookup(m.id)?.image ?? null} alt="" className="size-8" />
            <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
            {m.lure && (
              <span className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">
                <Shield className="size-3" aria-hidden /> lure
              </span>
            )}
            <b className="tabular-nums">{fmtK(m.dmg)}</b>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HintBlock({ hint, unit }: { hint: Hint; unit: string }) {
  return (
    <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4 text-sm">
      <p className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        <span>
          <b>Dica:</b> a melhor divisão possível hoje é a abaixo. Para fechar o hazard 0 ({fmtK(hint.need)}), faltam{" "}
          <b>{fmtK(hint.totalMissing)}</b> no total.
        </span>
      </p>
      <ul className="mt-3 space-y-3">
        {hint.teams.map(({ team, missing, weakest }, i) => (
          <li key={i}>
            <b>{unit} {i + 1} — {fmtK(team.total)}</b>{" "}
            {missing > 0 ? <span className={badText}>(falta {fmtK(missing)})</span> : <span className={okText}>(já fecha)</span>}
            <p className="text-muted">
              {pokebarOrder(team.members).map((m) => `${m.name}${m.lure ? " (lure)" : ""} ${fmtNum(m.dmg)}k`).join(" + ")}
              {missing > 0 && weakest && <> → foque em <b className="text-fg">{weakest.name}</b> (+{fmtK(missing)})</>}
            </p>
          </li>
        ))}
      </ul>
      {hint.teams.some((t) => t.missing > 0) && (
        <p className="mt-3 text-muted">
          Comece pela {unit.toLowerCase()} mais perto de fechar ({fmtK(hint.teams.find((t) => t.missing > 0)!.missing)} de falta) e vá
          subindo os pokémons mais fracos de cada {unit.toLowerCase()}.
        </p>
      )}
    </div>
  );
}

function ModeSection({ m, lookup }: { m: ModeAnalysis; lookup: Lookup }) {
  if (m.error) {
    return (
      <Card>
        <h3 className={`font-semibold ${badText}`}>{m.mode.label}</h3>
        <p className="mt-1 text-sm text-muted">{m.error}</p>
      </Card>
    );
  }
  if (m.best === null) {
    return (
      <Card>
        <h3 className={`flex items-center gap-2 font-semibold ${badText}`}>
          <CircleX className="size-5" aria-hidden /> {m.mode.label}: nenhum hazard fecha
        </h3>
        <p className="mt-1 text-sm text-muted">O time não bate nem o hazard 0 ({fmtK(requiredDamage(0))}) em todos os times.</p>
        {m.hint && <HintBlock hint={m.hint} unit={m.mode.unit} />}
      </Card>
    );
  }
  const b = m.best;
  const r = m.result!;
  const plan = r.plan!;
  const fx = effectsOf(b);
  return (
    <>
      <Card>
        <h3 className={`flex items-center gap-2 font-semibold ${okText}`}>
          <CircleCheck className="size-5" aria-hidden /> {m.mode.label}: pode ir até o hazard {b}
        </h3>
        <p className="mt-1 text-sm text-muted">
          Dano exigido por time: <b className="text-fg">~{fmtK(requiredDamage(b))}{ESTIMATED_HAZARDS.has(b) ? " (estimado)" : ""}</b> · Precision {precisionFor(b)} ·{" "}
          {b ? `${fx.damageDealt} dano causado · ${fx.damageTaken} dano recebido` : "sem penalidades"} · Drops: {dropsFor(b)} · Diferença entre times:{" "}
          <b className="text-fg">{fmtK(plan.spread)}</b> · Menor margem: <b className="text-fg">{fmtK(plan.minMargin)}</b>
          {r.runePct > 0 && <> · Runas: <b className="text-fg">+{fmtNum(r.runePct)}%</b></>}
        </p>
        {r.lureCount > 0 && (
          <p className="mt-2 text-sm text-muted">
            Em cada rotação, o Pokémon com <b className="text-fg">lure</b> fica em cima e o normal embaixo, na mesma ordem da sua Pokébar.
          </p>
        )}
      </Card>
      {plan.teams.map((t, i) => (
        <TeamCard key={i} index={i} total={t.total} required={r.required} members={t.members} lookup={lookup} />
      ))}
    </>
  );
}

function AllHazards({ modes }: { modes: ModeAnalysis[] }) {
  return (
    <Card>
      <h3 className="font-semibold">Todos os hazards</h3>
      <p className="mt-1 text-sm text-muted">Valores com ~ são aproximados; os com * (hazards 6 a 9 e 16) são estimados.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left">
              <th className={th}>Hazard</th>
              <th className={`${th} text-center`}>Dano exigido</th>
              <th className={`${th} text-center`}>Dano causado</th>
              <th className={`${th} text-center`}>Dano recebido</th>
              <th className={`${th} text-center`}>Drops</th>
              <th className={`${th} text-center`}>Precision</th>
              {modes.map((m) => <th key={m.mode.id} className={`${th} text-center`}>{m.mode.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {HAZARDS.map((h) => {
              const fx = effectsOf(h);
              return (
                <tr key={h} className="border-t border-line">
                  <td className={td}>{h}</td>
                  <td className={`${td} text-center tabular-nums`}>~{fmtK(requiredDamage(h))}{ESTIMATED_HAZARDS.has(h) ? "*" : ""}</td>
                  <td className={`${td} text-center ${badText}`}>{fx.damageDealt}</td>
                  <td className={`${td} text-center ${badText}`}>{fx.damageTaken}</td>
                  <td className={`${td} text-center`}>{dropsFor(h)}</td>
                  <td className={`${td} text-center`}>{precisionFor(h)}</td>
                  {modes.map((m) => <td key={m.mode.id} className={td}><StatusIcon value={m.ok[h] ?? null} /></td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompareTable({ rows }: { rows: CompareRow[] }) {
  const text = (c: CompareCell): string => {
    if (!("hazard" in c)) return c.kind === "count" ? "precisa de 6 pokémons" : "—";
    return c.hazard === null ? "nenhum" : `hazard ${c.hazard}`;
  };
  return (
    <Card>
      <h3 className="font-semibold">Comparar times</h3>
      <p className="mt-1 text-sm text-muted">Maior hazard que cada time fecha em cada modo.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className={th}>Time</th>
              {MODES.map((m) => <th key={m.id} className={`${th} text-center`}>{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className={td}>{r.name || "Sem nome"}{r.current && <span className="text-muted"> (atual)</span>}</td>
                {r.cells.map((c, j) => <td key={j} className={`${td} text-center`}>{text(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function RotationResults({ result, lookup }: { result: RotationResult; lookup: Lookup }) {
  const { analysis, compare } = result;
  if (analysis.countError) {
    // Mesmo com o time atual incompleto, comparar com os outros times continua útil.
    return (
      <div className="space-y-4">
        <Card className="flex items-start gap-3 border-red-400/40">
          <TriangleAlert className={`mt-0.5 size-5 shrink-0 ${badText}`} aria-hidden />
          <p className={`text-sm ${badText}`}>{analysis.countError}</p>
        </Card>
        {compare && <CompareTable rows={compare} />}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {analysis.modes.map((m) => <ModeSection key={m.mode.id} m={m} lookup={lookup} />)}
      <AllHazards modes={analysis.modes} />
      {compare && <CompareTable rows={compare} />}
    </div>
  );
}
