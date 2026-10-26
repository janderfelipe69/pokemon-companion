import type { ReactNode } from "react";
import { GuildLogin } from "@/components/guild/GuildLogin";
import { GuildSessionBar } from "@/components/guild/GuildSessionBar";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const metadata = { title: "Guilda | Pokémon Companion", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Tudo dentro de /guilda passa por aqui: sem login, o servidor devolve só a tela de entrada (nenhuma outra aba é enviada ao navegador). */
export default async function GuildAreaLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember();
  if (!member) return <GuildLogin />;
  return (
    <>
      <GuildSessionBar name={member.name} />
      {children}
    </>
  );
}
