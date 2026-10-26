import { redirect } from "next/navigation";
import { BallsView } from "@/components/guild/balls/BallsView";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const dynamic = "force-dynamic";

export default async function BallsPage() {
  if (!(await getCurrentMember())) redirect("/guilda");
  return <BallsView />;
}
