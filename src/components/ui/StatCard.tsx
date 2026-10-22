import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import { Badge } from "./Badge";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

/** Card de resumo. Os valores são sempre exemplos e vêm marcados como tal. */
export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-raised text-teal">
          <Icon className="size-5" aria-hidden />
        </span>
        <Badge>Exemplo</Badge>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );
}
