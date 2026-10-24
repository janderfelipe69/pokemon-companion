import { PokemonImage } from "@/components/pokedex/PokemonImage";

/** Miniatura quadrada de um Pokémon (usa a mesma imagem da Pokédex). */
export function PokemonThumb({ src, alt, className = "size-10" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`shrink-0 overflow-hidden rounded-lg border border-line ${className}`}>
      <PokemonImage key={src ?? "none"} src={src} alt={alt} className="[&_img]:p-0.5" />
    </div>
  );
}
