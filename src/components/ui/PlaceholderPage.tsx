import { Hammer } from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { PageHeader } from "./PageHeader";

type PlaceholderPageProps = {
  title: string;
  description: string;
  note?: string;
};

/** Página padrão para seções que ainda serão implementadas. */
export function PlaceholderPage({ title, description, note }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} badge={<Badge tone="gold">Em breve</Badge>} />
      <Card className="flex flex-col items-center px-6 py-14 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-raised text-gold">
          <Hammer className="size-6" aria-hidden />
        </span>
        <h2 className="mt-5 text-lg font-medium">Esta seção ainda não foi implementada</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          {note ?? "Ela será construída em uma das próximas etapas do projeto. Por enquanto, a navegação já está funcionando."}
        </p>
      </Card>
    </>
  );
}
