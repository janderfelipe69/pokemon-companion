import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  badge?: ReactNode;
};

export function PageHeader({ title, description, badge }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {badge}
      </div>
      {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
    </div>
  );
}
