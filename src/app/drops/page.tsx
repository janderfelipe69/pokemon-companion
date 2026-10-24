import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TalentsBrowser } from "@/components/talents/TalentsBrowser";
import { getTalents } from "@/lib/supabase/talents";

export const metadata = { title: "Drops de talentos | Pokémon Companion" };

/** Atualiza a página a cada 60 s. */
export const revalidate = 60;

export default async function DropsPage() {
  const { categories, status } = await getTalents();
  const total = categories.reduce((sum, c) => sum + c.talents.length, 0);

  return (
    <>
      <PageHeader
        title="Drops de talentos"
        description="Veja os itens que você precisa entregar para liberar cada talento, ou busque um item e descubra onde ele é usado."
        badge={total > 0 ? <Badge tone="teal">{total} talentos</Badge> : undefined}
      />
      {status !== "ok" ? (
        <Card className="text-sm text-muted">
          {status === "unconfigured"
            ? "O banco de dados ainda não está configurado neste ambiente."
            : "Os talentos ainda não estão disponíveis. Se você é administrador, confirme que o arquivo supabase/migrations/0006_talents.sql foi executado no Supabase."}
        </Card>
      ) : (
        <TalentsBrowser categories={categories} />
      )}
    </>
  );
}
