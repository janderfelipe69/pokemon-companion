export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 32 32" className="size-9 shrink-0" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="#1b2133" stroke="#262d42" strokeWidth="2" />
        <path d="M2 16a14 14 0 0 1 28 0H2Z" fill="#f2b84b" />
        <path d="M2 16h28" stroke="#0d1019" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="5" fill="#0d1019" />
        <circle cx="16" cy="16" r="2.5" fill="#43d0b4" />
      </svg>
      <div className="leading-tight">
        <p className="font-semibold tracking-tight">Pokémon Companion</p>
        <p className="text-xs text-muted">Guia de consulta</p>
      </div>
    </div>
  );
}
