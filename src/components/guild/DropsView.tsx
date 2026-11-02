"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoneLog } from "./StoneLog";
import { useLiveRound } from "./useLiveRound";

/** "Drops do boss": cole o log, publique e veja o plano de trocas da rodada se montando ao vivo, a cada pessoa que publica. */
export function DropsView({ me }: { me: string }) {
  const router = useRouter();
  const round = useLiveRound();

  return (
    <>
      <PageHeader title="Drops do boss" description="Cole o log do drop, veja quem precisa de cada stone e publique para entrar no plano de trocas da rodada. O plano se atualiza sozinho a cada pessoa que publica." />
      <StoneLog {...round} me={me} onChanged={round.refresh} onSessionLost={() => router.refresh()} />
    </>
  );
}
