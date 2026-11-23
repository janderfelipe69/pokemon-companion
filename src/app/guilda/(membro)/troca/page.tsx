import { Gem, Medal } from "lucide-react";
import { HomeShortcut } from "@/components/home/HomeShortcut";
import { PageHeader } from "@/components/ui/PageHeader";
import type { NavItem } from "@/config/navigation";

export const dynamic = "force-dynamic";

const channels: NavItem[] = [
  { href: "/guilda/troca/medalhas", label: "Troca de medalhas", description: "Marque as medalhas que você tem e as que quer, e veja quem combina com você", icon: Medal },
  { href: "/guilda/troca/boosts", label: "Troca de boosts", description: "Escolha os tipos e níveis de stone que você quer receber do boss", icon: Gem },
];

/** Escolha do canal de troca: o jogador decide o que vai trocar antes de entrar. */
export default function TradeHubPage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Troca" description="Escolha o que você quer trocar com o pessoal da guilda." />
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {channels.map((item) => (
          <HomeShortcut key={item.href} item={item} accent="gold" />
        ))}
      </div>
    </div>
  );
}
