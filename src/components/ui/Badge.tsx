import type { ReactNode } from "react";

const tones = {
  gold: "border-gold/40 bg-gold/10 text-gold",
  teal: "border-teal/40 bg-teal/10 text-teal",
  muted: "border-line bg-raised text-muted",
} as const;

type BadgeProps = {
  children: ReactNode;
  tone?: keyof typeof tones;
};

export function Badge({ children, tone = "muted" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
