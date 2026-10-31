import Link from "next/link";
import { Pokeball } from "@/components/ui/Pokeball";

export const metadata = { title: "Página não encontrada | Pokémon Companion" };

/** Página 404. */
export default function NotFound() {
  return (
    <div className="grid min-h-[55vh] place-items-center text-center">
      <div className="max-w-md">
        <Pokeball className="pb-float mx-auto size-20" />
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-gold">Erro 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Um Pokémon selvagem fugiu!</h1>
        <p className="mt-3 text-muted">Essa página não existe (ou o Team Rocket levou embora). Confira o endereço ou volte para o início.</p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
