import { redirect } from "next/navigation";

/** O antigo “Meus boosts” agora é a aba “Troca de boosts”. Mantém links e favoritos antigos funcionando. */
export default function OldBoostsPage() {
  redirect("/guilda/troca/boosts");
}
