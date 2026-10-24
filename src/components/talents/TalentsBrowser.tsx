"use client";

import { useMemo, useState } from "react";
import { PawPrint, Search, User } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { ItemImage } from "@/components/talents/ItemImage";
import type { TalentCategory } from "@/config/talents";
import { normalizeText } from "@/lib/talents/items";
import type { PublicTalent, PublicTalentCategory } from "@/lib/supabase/talents";

function CategoryIcon({ category, className = "size-6" }: { category: TalentCategory; className?: string }) {
  if (category.type) return <TypeIcon type={category.type} className={className} />;
  const Icon = category.key === "character" ? User : PawPrint;
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full bg-gold/15 text-gold ${className}`} aria-hidden>
      <Icon className="size-[60%]" aria-hidden />
    </span>
  );
}

/** Um talento no estilo da janela do jogo: o bônus à esquerda e os itens (com a quantidade) à direita. */
function TalentCard({ talent, highlight }: { talent: PublicTalent; highlight: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{talent.description}</p>
      {talent.requirements.length > 0 ? (
        <ul className="flex shrink-0 flex-wrap gap-2" aria-label="Itens necessários">
          {talent.requirements.map(({ item, quantity }) => {
            const match = highlight !== "" && normalizeText(item.name).includes(highlight);
            return (
              <li key={item.id} className="flex w-[4.5rem] flex-col items-center gap-1" title={`${item.name} × ${quantity}`}>
                <span className="relative">
                  <ItemImage path={item.imagePath} name={item.name} className={`size-12 ${match ? "ring-2 ring-gold" : ""}`} />
                  <span className="absolute -bottom-1 -right-1 rounded-md bg-black/85 px-1 text-[11px] font-bold tabular-nums leading-tight text-white ring-1 ring-white/20">
                    {quantity}
                  </span>
                </span>
                <span className={`line-clamp-2 w-full break-words text-center text-[10px] leading-tight ${match ? "font-semibold text-gold" : "text-muted"}`}>{item.name}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="shrink-0 text-xs text-muted">Itens ainda não cadastrados</span>
      )}
    </li>
  );
}

export function TalentsBrowser({ categories }: { categories: PublicTalentCategory[] }) {
  const [selected, setSelected] = useState(categories.find((c) => c.talents.length > 0)?.key ?? categories[0]?.key ?? "");
  const [query, setQuery] = useState("");

  const q = normalizeText(query);
  const category = categories.find((c) => c.key === selected) ?? categories[0];

  // Com busca: mostra, em todas as categorias, os talentos que pedem o item procurado.
  const results = useMemo(() => {
    if (!q) return [];
    return categories
      .map((c) => ({ category: c, talents: c.talents.filter((t) => t.requirements.some((r) => normalizeText(r.item.name).includes(q))) }))
      .filter((r) => r.talents.length > 0);
  }, [categories, q]);
  const resultCount = results.reduce((sum, r) => sum + r.talents.length, 0);

  if (!category) return null;

  return (
    <div className="space-y-5">
      <label className="block max-w-md">
        <span className="mb-1.5 block text-sm text-muted">Buscar um item e ver quais talentos pedem ele</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: earth ball"
            className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted/60"
          />
        </span>
      </label>

      {q ? (
        <div aria-live="polite" className="space-y-6">
          <p className="text-sm text-muted">
            {resultCount === 0 ? "Nenhum talento pede esse item." : `${resultCount} ${resultCount === 1 ? "talento pede" : "talentos pedem"} esse item.`}
          </p>
          {results.map(({ category: c, talents }) => (
            <section key={c.key} aria-label={c.label}>
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                <CategoryIcon category={c} className="size-6" /> {c.label}
              </h2>
              <ul className="space-y-2">
                {talents.map((t) => (
                  <TalentCard key={t.id} talent={t} highlight={q} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-5 md:flex-row">
          <nav aria-label="Categorias de talentos" className="flex flex-wrap gap-1.5 md:w-56 md:shrink-0 md:flex-col md:flex-nowrap">
            {categories.map((c) => {
              const on = c.key === category.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setSelected(c.key)}
                  aria-current={on ? "true" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    on ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:text-fg"
                  }`}
                >
                  <CategoryIcon category={c} />
                  <span className="flex-1 font-medium">{c.label}</span>
                  <span className="text-[11px] tabular-nums opacity-70">{c.talents.length}</span>
                </button>
              );
            })}
          </nav>

          <section className="min-w-0 flex-1" aria-label={category.label}>
            <h2 className="mb-3 flex items-center gap-2.5 text-lg font-semibold">
              <CategoryIcon category={category} className="size-8" /> {category.label}
              <span className="text-sm font-normal text-muted">
                {category.talents.length} {category.talents.length === 1 ? "talento" : "talentos"}
              </span>
            </h2>
            {category.talents.length > 0 ? (
              <ul className="space-y-2">
                {category.talents.map((t) => (
                  <TalentCard key={t.id} talent={t} highlight="" />
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-line bg-panel p-5 text-sm text-muted">Nenhum talento cadastrado nesta categoria ainda.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
