/**
 * Pokébola desenhada em SVG (cores do site: topo dourado, botão verde-água).
 * - `solid`: colorida, para o carregamento, a página 404 e detalhes.
 * - `line`: só o contorno em `currentColor`, para marca d'água bem discreta.
 */
export function Pokeball({ variant = "solid", className = "size-10" }: { variant?: "solid" | "line"; className?: string }) {
  if (variant === "line") {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="4" aria-hidden>
        <circle cx="50" cy="50" r="46" />
        <path d="M4 50h30M66 50h30" />
        <circle cx="50" cy="50" r="16" />
        <circle cx="50" cy="50" r="7" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="46" fill="#e8ebf3" />
      <path d="M4 50a46 46 0 0 1 92 0H4Z" fill="#f2b84b" />
      <path d="M20 35a34 34 0 0 1 20-17" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="5" strokeLinecap="round" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#0d1019" strokeWidth="6" />
      <path d="M4 50h92" stroke="#0d1019" strokeWidth="8" />
      <circle cx="50" cy="50" r="15" fill="#0d1019" />
      <circle cx="50" cy="50" r="8.5" fill="#43d0b4" />
    </svg>
  );
}
