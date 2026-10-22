import { typeInfo } from "@/config/pokemonTypes";
import { POKEMON_TYPES, type PokemonType } from "@/types/pokemon";

type TypeSelectProps = {
  label: string;
  value: PokemonType | "";
  onChange: (value: PokemonType | "") => void;
};

export function TypeSelect({ label, value, onChange }: TypeSelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PokemonType | "")}
        className="w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg"
      >
        <option value="">Todos os tipos</option>
        {POKEMON_TYPES.map((type) => (
          <option key={type} value={type}>
            {typeInfo[type].label}
          </option>
        ))}
      </select>
    </label>
  );
}
