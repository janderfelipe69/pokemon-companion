import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GUILD } from "@/config/guild";
import { getGuildEmblem } from "@/lib/guild/guildEmblem";
import "./globals.css";

export const metadata: Metadata = {
  title: `${GUILD.name} | Pokémon Companion`,
  description: `Central da guilda ${GUILD.name}: consulta de Pokémon, ferramentas e a área dos membros.`,
};

/** O emblema da guilda (o banner em uso) aparece no menu de todas as páginas: o layout se refaz de hora em hora, e na hora quando o admin troca o banner. */
export const revalidate = 3600;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const emblem = await getGuildEmblem();
  return (
    <html lang="pt-BR">
      <body>
        <AppShell emblem={emblem}>{children}</AppShell>
      </body>
    </html>
  );
}
