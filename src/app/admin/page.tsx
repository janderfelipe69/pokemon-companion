
import { AdminLogin } from "@/components/admin/AdminLogin";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { AdminPanel } from "@/components/admin/AdminPanel";
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
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-purple-400">Pokémon Companion</p>
          <h1 className="mt-1 text-2xl font-bold">Painel administrativo</h1>
          <p className="mt-1 text-sm text-gray-400">Escolha a área que quer editar.</p>
        </div>
        <LogoutButton />
      </div>

      <AdminPanel />
    </main>
  );
}
