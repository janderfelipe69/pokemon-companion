import { LinkedTasksList } from "@/components/tasks/LinkedTasksList";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildTaskViews } from "@/lib/linkedTasks";

export const metadata = { title: "Linked Tasks | Pokémon Companion" };

export default function LinkedTasksPage() {
  const tasks = buildTaskViews();
  return (
    <>
      <PageHeader title="Linked Tasks" description="As tarefas na ordem do jogo: quantos mobs matar, qual Pokémon e o tipo de hunt. Só dá para ir para a próxima depois de terminar a anterior." />
      <LinkedTasksList tasks={tasks} />
    </>
  );
}
