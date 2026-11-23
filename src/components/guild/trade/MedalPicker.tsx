"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { normalize } from "@/lib/pokemonFilters";

export type TradeMedal = { id: number; name: string; spriteId: number };

type Props = {
  medals: TradeMedal[];
  /** Medalhas já escolhidas e o número mostrado no selo (quantidade, ou 1 para só "marcada"). */
  chosen: Map<number, number>;
  /** Medalhas que não podem ser escolhidas aqui, com o motivo. */
  blocked?: Map<number, string>;
  hint: string;
  /** Mostra um ✓ em vez de número (para escolha sem quantidade). */
  checkOnly?: boolean;
  onPick: (medalId: number) => void;
};

/** Grade de todas as medalhas do jogo, com busca. Usada para adicionar ofertas e para escolher o que aceita em troca. */
export function MedalPicker({ medals, chosen, blocked, hint, checkOnly = false, onPick }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = normalize(query);
    return q ? medals.filter((m) => normalize(m.name).includes(q) || String(m.id) === q) : medals;
  }, [medals, query]);

  return (
    <div className="space-y-3 rounded-lg border border-line bg-raised p-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar medalha por nome ou número" className="w-full rounded-lg border border-line bg-ink py-2 pl-9 pr-3 text-sm outline-none focus:border-gold/60" />
      </label>
      <p className="text-xs text-muted">{hint}</p>
      <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5">
        {filtered.map((m) => {
          const reason = blocked?.get(m.id);
          const picked = chosen.get(m.id) ?? 0;
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={Boolean(reason)}
                onClick={() => onPick(m.id)}
                title={reason ?? m.name}
                className={`relative flex w-full flex-col items-center gap-1 rounded-lg border bg-black/25 px-1.5 py-2 text-center text-xs transition-colors enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${picked > 0 ? "border-gold/70" : "border-line"}`}
              >
                {picked > 0 && (
                  <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold leading-4 text-ink">
                    {checkOnly ? <Check className="size-3" aria-hidden /> : picked}
                  </span>
                )}
                <MedalBadge spriteId={m.spriteId} className="size-10" />
                <span className="line-clamp-1 font-medium">{m.name}</span>
                <span className="line-clamp-1 text-[10px] text-muted">{reason ?? `#${m.id}`}</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && <li className="col-span-full py-4 text-center text-sm text-muted">Nenhuma medalha com esse nome.</li>}
      </ul>
    </div>
  );
}
