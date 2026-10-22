import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-line bg-panel p-5 ${className}`}>
      {children}
    </div>
  );
}
