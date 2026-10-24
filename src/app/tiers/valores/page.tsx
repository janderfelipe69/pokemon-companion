import { redirect } from "next/navigation";

/** A antiga "Tabela de valores" foi unida à página de Tiers e valores. Mantém links antigos funcionando. */
export default function PricesRedirect() {
  redirect("/tiers");
}
