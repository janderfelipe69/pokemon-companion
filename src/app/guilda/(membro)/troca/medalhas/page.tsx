import { redirect } from "next/navigation";
import { MedalTradeView, type TradeTab } from "@/components/guild/trade/MedalTradeView";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { getMedals } from "@/lib/supabase/medals";

export const dynamic = "force-dynamic";

export default async function MedalTradePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  if (!(await getCurrentMember())) redirect("/guilda");
  const { aba } = await searchParams;
  const initialTab: TradeTab = aba === "quero" || aba === "trocas" || aba === "mercado" ? aba : "tenho";
  const { medals } = await getMedals();
  return (
    <>
      <PageHeader title="Troca de medalhas" description="Marque as medalhas que você tem e as que quer. O site cruza as listas e avisa quando alguém combina com você." />
      <MedalTradeView medals={medals.map((m) => ({ id: m.id, name: m.name, spriteId: m.spriteId }))} initialTab={initialTab} />
    </>
  );
}
