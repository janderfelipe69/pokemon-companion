"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ItemImage } from "@/components/talents/ItemImage";
import { normalizeText, type TalentItem } from "@/lib/talents/items";

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60";

/** Conteúdo da janela "Escolher item": busca por nome e grade de itens com imagem. */
export function ItemPicker({ items, excludeIds, onPick, onClose }: { items: TalentItem[]; excludeIds: Set<number>; onPick: (item: TalentItem) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = normalizeText(query);
    return items.filter((i) => !excludeIds.has(i.id) && (!q || normalizeText(i.name).includes(q)));
  }, [items, excludeIds, query]);

  return (
    <div className="p-5 pr-14">
      <h3 className="text-lg font-semibold">Escolher item</h3>
      <label className="mt-3 block">
        <span className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Dentro de um formulário (cadastro de Pokémon), Enter não pode enviar o formulário.
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()} placeholder="Buscar pelo nome" aria-label="Buscar item pelo nome" className={`${inputClass} pl-9`} />
        </span>
      </label>
      {visible.length > 0 ? (
        <div className="mt-3 grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPick(item);
                onClose();
              }}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-black/25 p-2 text-center hover:border-gold/60 hover:bg-white/5"
            >
              <ItemImage path={item.imagePath} name={item.name} className="size-12" />
              <span className="line-clamp-2 w-full break-words text-[11px] font-medium leading-tight">{item.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          {items.length === 0 ? "Ainda não há itens. Envie as imagens na aba Itens primeiro." : "Nenhum item encontrado (ou todos já estão neste talento)."}
        </p>
      )}
    </div>
  );
}
