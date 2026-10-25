"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { isBoostType } from "@/config/guildBoost";
import { groupByType, parseStones, summaryText, type PersonWants } from "@/lib/guild/boostStones";

/** Cole o log do drop do boss e veja, tipo por tipo, quem precisa de cada stone. */
export function StoneLog({ people, loading, error }: { people: PersonWants[] | null; loading: boolean; error: string }) {
  const [text, setText] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copiar resumo");

  const stones = useMemo(() => parseStones(text), [text]);
  const groups = useMemo(() => groupByType(stones, people ?? []), [stones, people]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryText(groups));
      setCopyLabel("Copiado!");
    } catch {
      setCopyLabel("Não foi possível copiar");
    }
    setTimeout(() => setCopyLabel("Copiar resumo"), 1800);
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 block text-sm text-muted">Cole aqui o log do drop do boss da guilda</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui o log do drop..."
          className="min-h-28 w-full resize-y rounded-lg border border-line bg-raised p-3 font-mono text-xs text-fg placeholder:text-muted/60"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copy()} disabled={groups.length === 0} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40">
          {copyLabel}
        </button>
        <button type="button" onClick={() => setText("")} disabled={!text} className="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40">
          Limpar
        </button>
        <span className="text-sm text-muted" aria-live="polite">
          {stones.length > 0 ? `${stones.length} ${stones.length === 1 ? "stone encontrada" : "stones encontradas"}` : ""}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      {loading && !error && <p className="mt-3 text-sm text-muted">Carregando a lista da guilda...</p>}

      {text.trim() !== "" && groups.length === 0 && (
        <p className="mt-4 text-sm text-muted">Não encontrei nenhuma stone nesse texto. Cole o log do drop exatamente como aparece no jogo.</p>
      )}
      {text.trim() === "" && <p className="mt-4 text-sm text-muted">Cole o log acima para ver quem precisa de cada stone.</p>}

      {groups.length > 0 && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {groups.map((g) => (
            <section key={g.typeKey} className="rounded-xl border border-line bg-black/20 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                {isBoostType(g.typeKey) && <TypeIcon type={g.typeKey} className="size-6" />}
                {g.type}
              </h3>
              <ul>
                {g.stones.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2 border-t border-line py-1 text-sm first:border-t-0">
                    <b className="font-semibold">
                      {s.qty}x {s.tier}
                    </b>
                    <span className="whitespace-nowrap text-muted">
                      +{s.min} a +{s.max} · {s.chance}%
                    </span>
                  </li>
                ))}
              </ul>
              {g.names.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {g.names.map((name) => (
                    <span key={name} className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink">
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2.5 text-xs text-muted">Ninguém precisa</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
