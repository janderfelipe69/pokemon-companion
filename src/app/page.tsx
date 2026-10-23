import { BookOpen, Layers, Map, Sparkles, Construction } from "lucide-react";
import { mainNav } from "@/config/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { ShortcutCard } from "@/components/ui/ShortcutCard";
import { Logo } from "@/components/layout/Logo";

const exampleStats = [
  { label: "Pokémon cadastrados", value: "000", icon: BookOpen },
  { label: "Tiers definidos", value: "0", icon: Layers },
  { label: "Talentos mapeados", value: "000", icon: Sparkles },
  { label: "Rotas de farm", value: "00", icon: Map },
];

export default function DashboardPage() {
  const shortcuts = mainNav.filter((item) => item.href !== "/" && !item.adminOnly);

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-line bg-gradient-to-br from-raised to-panel p-6 sm:p-8">
        <Logo />
        <h1 className="mt-6 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Tudo o que você precisa consultar, em um só lugar.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Pokédex, tiers, drops, rotas e times reunidos em um painel simples de usar.
        </p>
      </section>

      <Card className="flex items-start gap-4 border-gold/40 bg-gold/5">
        <Construction className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        <div>
          <p className="font-medium">Sistema em desenvolvimento</p>
          <p className="mt-1 text-sm text-muted">
            Esta é a estrutura visual inicial. As informações reais de cada seção serão adicionadas nas próximas etapas.
          </p>
        </div>
      </Card>

      <section aria-labelledby="resumo">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="resumo" className="text-lg font-semibold">Resumo</h2>
          <Badge tone="teal">Dados de exemplo</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {exampleStats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">
          Os números acima são apenas ilustrativos e não representam dados reais do jogo.
        </p>
      </section>

      <section aria-labelledby="atalhos">
        <h2 id="atalhos" className="mb-4 text-lg font-semibold">Atalhos</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {shortcuts.map((item) => (
            <ShortcutCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
