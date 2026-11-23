import { redirect } from "next/navigation";
import { BoostsView } from "@/components/guild/BoostsView";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const dynamic = "force-dynamic";

export default async function BoostTradePage() {
  if (!(await getCurrentMember())) redirect("/guilda"); // o layout mostra a tela de entrada
  return <BoostsView />;
}
