"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { typeInfo } from "@/config/pokemonTypes";
import { catalogRecordOf, entryImageUrl } from "@/lib/globalDex";
import type { GlobalDexEntry } from "@/types/globalDex";
import { POKEMON_TYPES, TIERS, type PokemonType } from "@/types/pokemon";
import type { AdminRow } from "./types";
import { dropsPayload, PokemonDropsEditor, usePokemonDrops, validateDrops } from "./PokemonDropsEditor";

type Fields = {
  tier: string;
  offensiveTypes: PokemonType[];
  priceKk: string;
  priceBrl: string;
  evolutionItem: string;
  stages: [string, string, string];
  notes: string;
};

const asText = (v: string | number | null | undefined) => (v == null ? "" : String(v));

function fieldsFrom(row: AdminRow | undefined): Fields {
  const log = Array.isArray(row?.pokemon_pokelog) ? row?.pokemon_pokelog?.[0] : undefined;
  return {
    tier: row?.tier ?? "",
    offensiveTypes: [...(row?.pokemon_offensive_types ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((t) => t.type_code as PokemonType),
    priceKk: asText(row?.price_kk),
    priceBrl: asText(row?.price_brl),
    evolutionItem: row?.evolution_item ?? "",
    stages: [asText(log?.stage_1), asText(log?.stage_2), asText(log?.stage_3)],
    notes: row?.notes ?? "",
  };
}

const inputClass = "mt-1.5 w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-muted";
const labelClass = "block text-sm text-muted";

type Props = {
  /** Forma da Pokédex global. `null` = registro antigo sem correspondência (edita só os campos do catálogo). */
  entry: GlobalDexEntry | null;
  /** Registro do catálogo que está sendo editado (modo edição). */
  row: AdminRow | null;
  rows: AdminRow[];
  onSaved: (message: string) => void;
  onClose: () => void;
};

export function PokemonForm({ entry, row, rows, onSaved, onClose }: Props) {
  const editing = row !== null;
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const [shiny, setShiny] = useState(row ? row.id.startsWith("shiny-") : false);
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(row ?? (entry ? rowsById.get(entry.id) : undefined)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // O que será gravado: tudo que vem da Pokédex global é automático.
  // Ao editar, nome e variante do registro são preservados; só ao cadastrar é que vêm da Pokédex global.
  const record = row
    ? { id: row.id, name: row.name, variant: row.variant }
    : catalogRecordOf(entry!, shiny);
  const existing = rowsById.get(record.id);
  const imageUrl = entry ? entryImageUrl(entry, shiny) : row?.image_url ?? null;
  const dexNumber = entry?.dex ?? row?.pokedex_number ?? null;
  const originalTypes: string[] =
    entry?.types ?? [...(row?.pokemon_defensive_types ?? [])].sort((a, b) => a.position - b.position).map((t) => t.type_code);
  const evolutionText = entry ? (entry.evolvesTo ? entry.evolvesTo.join(", ") : row?.evolution ?? "") : row?.evolution ?? "";
  const title = record.variant ? `${record.variant} ${record.name}` : record.name;
  const dropsState = usePokemonDrops(record.id, existing !== undefined);

  function chooseShiny(next: boolean) {
    if (!entry || next === shiny) return;
    setShiny(next);
    setFields(fieldsFrom(rowsById.get(catalogRecordOf(entry, next).id)));
    setError("");
  }

  function toggleType(type: PokemonType) {
    setFields((old) => {
      if (old.offensiveTypes.includes(type)) return { ...old, offensiveTypes: old.offensiveTypes.filter((t) => t !== type) };
      if (old.offensiveTypes.length >= 2) return old;
      return { ...old, offensiveTypes: [...old.offensiveTypes, type] };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fields.tier) return setError("Escolha o tier do Pokémon.");
    if (fields.offensiveTypes.length < 1) return setError("Escolha pelo menos 1 tipo ofensivo (máximo 2).");
    const dropsProblem = dropsState.dirty ? validateDrops(dropsState.drops) : null;
    if (dropsProblem) return setError(dropsProblem);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pokemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: record.id,
          name: record.name,
          variant: record.variant,
          tier: fields.tier,
          listedType: fields.offensiveTypes[0] ?? null,
          defensiveTypes: originalTypes,
          offensiveTypes: fields.offensiveTypes,
          notes: fields.notes,
          priceKk: fields.priceKk,
          priceBrl: fields.priceBrl,
          pokedexNumber: dexNumber ?? undefined,
          imageUrl: imageUrl ?? undefined,
          // Sem dado de evolução na lista parcial, não mexe no que já estava salvo.
          evolution: entry ? (entry.evolvesTo ? entry.evolvesTo.join(", ") : undefined) : undefined,
          evolutionItem: fields.evolutionItem,
          pokelogStages: fields.stages,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");

      // Drops só são enviados se você mexeu neles (e depois do Pokémon, que precisa existir no catálogo).
      if (dropsState.dirty) {
        const dropsResponse = await fetch("/api/admin/pokemon-drops", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pokemonId: record.id, drops: dropsPayload(dropsState.drops) }),
        });
        const dropsData = await dropsResponse.json().catch(() => ({}));
        if (!dropsResponse.ok) throw new Error(`O Pokémon foi salvo, mas os drops não: ${dropsData.error || "erro ao salvar."}`);
      }
      onSaved(existing ? `${title} atualizado no catálogo.` : `${title} adicionado ao catálogo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      {/* Resumo automático: vem da Pokédex global, não precisa digitar nada */}
      <div className="flex gap-4 border-b border-line p-5 pr-14">
        <div className="w-28 shrink-0 overflow-hidden rounded-lg border border-line sm:w-36">
          <PokemonImage key={imageUrl ?? "none"} src={imageUrl} alt={title} />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted tabular-nums">{dexNumber != null ? `Pokédex nº ${dexNumber}` : "Sem número na Pokédex"}</p>
          <h2 className="text-xl font-semibold leading-snug">{title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {originalTypes.map((t) => (POKEMON_TYPES as readonly string[]).includes(t) && <TypeBadge key={t} type={t as PokemonType} />)}
          </div>
          <p className="text-sm text-muted">
            Evolução: <span className="text-fg">{evolutionText || (entry?.evolvesTo ? "não evolui" : "—")}</span>
          </p>
          {entry && !editing ? (
            <div role="group" aria-label="Versão" className="flex w-fit gap-1 rounded-lg border border-line bg-ink/40 p-1">
              {[false, true].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => chooseShiny(value)}
                  aria-pressed={shiny === value}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    shiny === value ? "bg-raised text-gold" : "text-muted hover:text-fg"
                  }`}
                >
                  {value && <Sparkles className="size-3.5" aria-hidden />}
                  {value ? "Shiny" : "Normal"}
                </button>
              ))}
            </div>
          ) : (
            shiny && <Badge tone="gold">Shiny</Badge>
          )}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {existing && !editing && (
          <p className="rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-muted">
            <strong className="font-medium text-fg">Já está no catálogo.</strong> Salvar vai atualizar os dados abaixo.
          </p>
        )}
        {!entry && (
          <p className="rounded-lg border border-line bg-raised p-3 text-sm text-muted">
            Este registro não tem correspondência na Pokédex global; nome, número e imagem ficam como estão.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className={labelClass}>
            Tier <span className="text-xs text-red-300">(obrigatório)</span>
            <select required value={fields.tier} onChange={(e) => setFields({ ...fields, tier: e.target.value })} className={inputClass}>
              <option value="" disabled>Selecione o tier</option>
              {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Preço individual (KK)
            <input inputMode="decimal" value={fields.priceKk} onChange={(e) => setFields({ ...fields, priceKk: e.target.value })} placeholder="Opcional" className={inputClass} />
          </label>
          <label className={labelClass}>
            Preço individual (R$)
            <input inputMode="decimal" value={fields.priceBrl} onChange={(e) => setFields({ ...fields, priceBrl: e.target.value })} placeholder="Opcional" className={inputClass} />
          </label>
        </div>
        <p className="-mt-3 text-xs text-muted">Preço em branco = usa o preço do tier.</p>

        <fieldset>
          <legend className="mb-2 text-sm text-muted">Tipos ofensivos das skills (1 a 2) <span className="text-xs text-red-300">(obrigatório)</span></legend>
          <div className="flex flex-wrap gap-2">
            {POKEMON_TYPES.map((type) => {
              const on = fields.offensiveTypes.includes(type);
              const { label, color } = typeInfo[type];
              return (
                <label
                  key={type}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${on ? "font-medium" : "text-muted hover:text-fg"}`}
                  style={on ? { color, borderColor: `${color}99`, backgroundColor: `${color}26` } : { borderColor: "var(--color-line)" }}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleType(type)} />
                  <TypeIcon type={type} className="size-6" />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <label className={labelClass}>
          Item de evolução <span className="text-xs">(opcional)</span>
          <input maxLength={200} value={fields.evolutionItem} onChange={(e) => setFields({ ...fields, evolutionItem: e.target.value })} placeholder="Ex.: Shiny Stone" className={inputClass} />
        </label>

        <fieldset>
          <legend className="mb-2 text-sm text-muted">Pokélog — quantidade de abates por etapa</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {fields.stages.map((stage, index) => (
              <label key={index} className={labelClass}>
                Etapa {index + 1}
                <input
                  type="number"
                  min="0"
                  value={stage}
                  onChange={(e) => {
                    const stages = [...fields.stages] as Fields["stages"];
                    stages[index] = e.target.value;
                    setFields({ ...fields, stages });
                  }}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <PokemonDropsEditor state={dropsState} />

        <label className={labelClass}>
          Observações <span className="text-xs">(opcional)</span>
          <textarea rows={2} maxLength={500} value={fields.notes} onChange={(e) => setFields({ ...fields, notes: e.target.value })} className={inputClass} />
        </label>

        {error && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Salvando…" : existing ? "Salvar alterações" : "Adicionar ao catálogo"}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-raised px-5 py-2.5 text-sm font-medium hover:border-gold/50 hover:text-gold">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}
