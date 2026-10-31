import { Pokeball } from "@/components/ui/Pokeball";

/** Aparece enquanto uma página carrega: uma Pokébola girando. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[45vh] place-items-center">
      <div className="flex flex-col items-center gap-4 text-muted">
        <Pokeball className="pb-spin size-14" />
        <span className="text-sm">Carregando...</span>
      </div>
    </div>
  );
}
