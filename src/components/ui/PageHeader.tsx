import type { ReactNode } from "react";
import { Pokeball } from "./Pokeball";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
};

export function PageHeader({ title, description, badge }: PageHeaderProps) {
  return (
    <div className="relative mb-8">
      {/* Marca d'água: uma Pokébola só de contorno, quase invisível, atrás do título. */}
      <Pokeball variant="line" className="pointer-events-none absolute -top-3 right-0 hidden size-28 text-gold/[0.07] sm:block" />
      <div className="relative flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {badge}
      </div>
      <div aria-hidden className="relative mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-gold to-teal" />
      {description && <p className="relative mt-3 max-w-2xl text-muted">{description}</p>}
    </div>
  );
}
