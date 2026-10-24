import { Card } from "@/components/ui/Card";
import { fmtK } from "@/lib/damageTest/format";
import { dropsFor, effectsOf, ESTIMATED_HAZARDS, HAZARDS, precisionFor, requiredDamage } from "@/lib/damageTest/hazards";
import { badText, okText, td, th } from "./ui";

export function HazardsTab() {
  return (
    <Card>
      <h2 className="text-lg font-semibold">Efeitos de cada hazard</h2>
      <p className="mt-1 text-sm text-muted">
        Cada nível soma o mesmo padrão: -3% dano causado, +5% dano recebido, -1% crítico, +1% sofrer crítico, +5% XP e +0,5% saque. Os drops{" "}
        <b className="text-fg">Legend</b> são liberados a partir do hazard 5 e os <b className="text-fg">Mythic</b> a partir do 10. O{" "}
        <b className="text-fg">dano exigido</b> é o que o time precisa bater. Valores com ~ são aproximados; os hazards 6 a 9 e 16 são estimados.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="text-left">
              <th className={th}>Hazard</th>
              <th className={`${th} text-center`}>Dano exigido</th>
              <th className={`${th} text-center`}>Dano causado</th>
              <th className={`${th} text-center`}>Dano recebido</th>
              <th className={`${th} text-center`}>Crítico</th>
              <th className={`${th} text-center`}>Sofrer crítico</th>
              <th className={`${th} text-center`}>XP</th>
              <th className={`${th} text-center`}>Saque</th>
              <th className={`${th} text-center`}>Drops liberados</th>
              <th className={`${th} text-center`}>Precision</th>
            </tr>
          </thead>
          <tbody>
            {HAZARDS.map((h) => {
              const fx = effectsOf(h);
              return (
                <tr key={h} className="border-t border-line">
                  <td className={`${td} font-semibold`}>{h}</td>
                  <td className={`${td} text-center tabular-nums`}>
                    ~{fmtK(requiredDamage(h))}
                    {ESTIMATED_HAZARDS.has(h) && <span className="text-muted"> (estimado)</span>}
                  </td>
                  <td className={`${td} text-center ${badText}`}>{fx.damageDealt}</td>
                  <td className={`${td} text-center ${badText}`}>{fx.damageTaken}</td>
                  <td className={`${td} text-center ${badText}`}>{fx.crit}</td>
                  <td className={`${td} text-center ${badText}`}>{fx.critTaken}</td>
                  <td className={`${td} text-center ${okText}`}>{fx.xp}</td>
                  <td className={`${td} text-center ${okText}`}>{fx.loot}</td>
                  <td className={`${td} text-center ${okText}`}>{dropsFor(h)}</td>
                  <td className={`${td} text-center`}>{precisionFor(h)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
