import { redirect } from "next/navigation";
import { MedalTradeView, type TradeTab } from "@/components/guild/trade/MedalTradeView";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { getMedals } from "@/lib/supabase/medals";

export const dynamic = "force-dynamic";

const TABS: TradeTab[] = ["lista", "matches", "mercado"];

export default async function MedalTradePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  if (!(await getCurrentMember())) redirect("/guilda");
  const { aba } = await searchParams;
  const initialTab = TABS.find((t) => t === aba) ?? "lista";
  const { medals } = await getMedals();
  return <MedalTradeView medals={medals.map((m) => ({ id: m.id, name: m.name, spriteId: m.spriteId }))} initialTab={initialTab} />;
}
