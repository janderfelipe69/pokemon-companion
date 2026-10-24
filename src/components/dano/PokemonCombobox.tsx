"use client";

import { useId, useMemo, useRef, useState } from "react";
import { tierColors, tierLabel } from "@/config/tiers";
import { searchPokemon, type DexOption, type Indexed } from "@/lib/damageTest/search";
import { PokemonThumb } from "./PokemonThumb";
import { inputClass } from "./ui";

type Props = {
  /** Texto para leitores de tela (ex.: "Pokémon 1"). */
  label: string;
  /** Pokémon escolhido da Pokédex (`null` = vazio). */
  selected: DexOption | null;
  /** Nome salvo, usado se o Pokémon não estiver mais na Pokédex. */
  fallbackName: string;
  index: readonly Indexed[];
  onPick: (option: DexOption) => void;
};

/** Campo de busca que só aceita Pokémon cadastrados na Pokédex. */
export function PokemonCombobox({ label, selected, fallbackName, index, onPick }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => (open ? searchPokemon(index, query, 8) : []), [open, index, query]);

  const shownName = selected?.name ?? fallbackName;
  const choose = (option: DexOption) => {
    onPick(option);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, Math.max(0, results.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      {selected || fallbackName ? (
        <PokemonThumb src={selected?.image ?? null} alt="" />
      ) : (
        <div className="size-10 shrink-0 rounded-lg border border-dashed border-line" aria-hidden />
      )}
      <input
        ref={inputRef}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        className={`${inputClass} min-w-0 flex-1`}
        placeholder="Buscar na Pokédex…"
        value={open ? query : shownName}
        onFocus={(e) => {
          setOpen(true);
          setQuery("");
          setActive(0);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`Resultados para ${label}`}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-panel p-1 shadow-xl shadow-black/40"
        >
          {results.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-muted">
              Nenhum Pokémon da Pokédex com esse nome.
            </li>
          ) : (
            results.map((o, i) => (
              <li
                key={o.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} // não tira o foco do campo antes do clique
                onClick={() => choose(o)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 ${i === active ? "bg-raised" : ""}`}
              >
                <PokemonThumb src={o.image} alt="" className="size-9" />
                <span className="min-w-0 flex-1 truncate text-sm">{o.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                  <span className="size-2 rounded-full" style={{ backgroundColor: tierColors[o.tier] }} aria-hidden />
                  {tierLabel(o.tier)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
