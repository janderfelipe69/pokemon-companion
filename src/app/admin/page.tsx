
import { AdminLogin } from "@/components/admin/AdminLogin";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { PokemonManager } from "@/components/admin/PokemonManager";
import { TierPricesManager } from "@/components/admin/TierPricesManager";
import { isAdminAuthenticated } from "@/lib/auth/session";

export const metadata = {
  title: "Administração | Pokémon Companion",
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-12">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm font-medium uppercase tracking-widest text-purple-400">
          Pokémon Companion
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Painel administrativo
        </h1>

        <p className="mt-3 text-gray-400">
          Gerencie Pokémon, tipagens e preços diretamente pelo site.
        </p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>

      <TierPricesManager />
      <PokemonManager />
    </main>
  );
}
