import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { TradeTabs } from "@/components/guild/trade/TradeTabs";

export const dynamic = "force-dynamic";

/** Troca da guilda: um cabeçalho e as duas funções (medalhas e boosts) em abas. O login já é cobrado pelo layout da guilda. */
export default function TradeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Troca" description="Tudo o que a guilda troca entre si: medalhas do jogo e as stones do boss." />
      <TradeTabs />
      {children}
    </>
  );
}
