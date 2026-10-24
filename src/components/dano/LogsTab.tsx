"use client";

import { useEffect, useMemo, useState, type Dispatch } from "react";
import { Card } from "@/components/ui/Card";
import { fmtK, fmtNum, fmtSignedK } from "@/lib/damageTest/format";
import { evolutionOf, type Action, type DamageLog } from "@/lib/damageTest/state";
import { badText, btnGhost, inputClass, okText, td, th } from "./ui";

const fmtDate = (t: number) =>
  new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export function LogsTab({ logs, dispatch }: { logs: readonly DamageLog[]; dispatch: Dispatch<Action> }) {
  const [filter, setFilter] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  const evolution = useMemo(() => evolutionOf(logs), [logs]);
  const history = useMemo(() => logs.filter((l) => !filter || l.name === filter).slice().reverse(), [logs, filter]);
  const activeFilter = evolution.some((e) => e.name === filter) ? filter : "";

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Evolução dos pokémons</h2>
        {evolution.length === 0 ? (
          <p className="text-sm text-muted">Ainda sem registros. Quando você alterar o dano de um pokémon, a evolução aparece aqui.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className={th}>Pokémon</th>
                  <th className={`${th} text-center`}>Início</th>
                  <th className={`${th} text-center`}>Atual</th>
                  <th className={`${th} text-center`}>Ganho</th>
                  <th className={`${th} text-center`}>Updates</th>
                </tr>
              </thead>
              <tbody>
                {evolution.map((e) => (
                  <tr key={e.name} className="border-t border-line">
                    <td className={td}>{e.name}</td>
                    <td className={`${td} text-center tabular-nums`}>{fmtK(e.first)}</td>
                    <td className={`${td} text-center tabular-nums`}><b>{fmtK(e.last)}</b></td>
                    <td className={`${td} text-center tabular-nums ${e.gain >= 0 ? okText : badText}`}>{fmtSignedK(e.gain)}</td>
                    <td className={`${td} text-center`}>{e.updates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Histórico</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-40 flex-1 text-xs text-muted">
            <span className="mb-1 block">Filtrar por pokémon</span>
            <select className={`${inputClass} w-full`} value={activeFilter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Todos</option>
              {evolution.map((e) => <option key={e.name}>{e.name}</option>)}
            </select>
          </label>
          <button
            type="button"
            className={btnGhost}
            disabled={logs.length === 0}
            onClick={() => {
              if (!confirm) return setConfirm(true);
              setConfirm(false);
              dispatch({ type: "clear-logs" });
            }}
          >
            {confirm ? "Confirmar limpeza" : "Limpar logs"}
          </button>
        </div>
        <div className="mt-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted">Nenhum registro. Altere o dano de um pokémon e ele aparece aqui, com o dano antigo, o novo e quanto subiu.</p>
          ) : (
            <ul>
              {history.map((l, i) => {
                const diff = l.old != null ? l.value - l.old : 0;
                return (
                  <li key={`${l.at}-${l.name}-${i}`} className="border-b border-dashed border-line py-2.5 last:border-0">
                    <p className="text-xs text-muted">{fmtDate(l.at)} · {l.team}</p>
                    <p className="font-semibold">{l.name}</p>
                    <p>
                      {l.old != null ? (
                        <>
                          {fmtK(l.old)} → <b>{fmtK(l.value)}</b>{" "}
                          <span className={`font-semibold ${diff >= 0 ? okText : badText}`}>
                            {diff >= 0 ? "▲" : "▼"} {fmtSignedK(diff)} ({diff >= 0 ? "+" : ""}{fmtNum((diff / l.old) * 100)}%)
                          </span>
                        </>
                      ) : (
                        <>novo: <b>{fmtK(l.value)}</b></>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
