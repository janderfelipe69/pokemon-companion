import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { GuildBoard } from "@/components/guild/GuildBoard";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { loadGuildFolder } from "@/lib/guild/files";

export const metadata = { title: "Guilda | Pokémon Companion", robots: { index: false, follow: false } };

/** Lê a pasta a cada acesso: um JSON novo em data/guild aparece ao recarregar a página. */
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ arquivo?: string | string[] }> };

export default async function GuildPage({ searchParams }: PageProps) {
  // Página restrita ao administrador: sem sessão válida, mostra só o login e
  // NÃO lê data/guild nem envia nenhum dado da guilda ao navegador.
  if (!(await isAdminAuthenticated())) {
    return <AdminLogin />;
  }

  const params = await searchParams;
  const wanted = Array.isArray(params.arquivo) ? params.arquivo[0] : params.arquivo;

  const { exports, skipped } = await loadGuildFolder();
  const canSave = true; // já validado acima: só o admin chega até aqui

  // O nome pedido na URL só vale se for um dos arquivos da pasta (nunca vira caminho de disco).
  const found = wanted ? exports.findIndex((e) => e.file === wanted) : -1;
  const index = found >= 0 ? found : 0;
  const current = exports[index] ?? null;
  const previous = exports[index + 1]?.data ?? null;

  return (
    <>
      <PageHeader
        title="Guilda"
        description="Imagem do progresso semanal da guilda, montada a partir do JSON exportado do jogo."
        badge={<Badge tone="teal">{exports.length} {exports.length === 1 ? "exportação" : "exportações"} na pasta</Badge>}
      />

      {skipped.length > 0 && (
        <Card className="mb-6 border-gold/40 bg-gold/5">
          <p className="text-sm font-medium">Alguns arquivos da pasta foram ignorados</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {skipped.map((s) => (
              <li key={s.file}>
                <span className="text-fg">{s.file}</span>: {s.error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <GuildBoard
        current={current?.data ?? null}
        previous={previous}
        currentFile={current?.file ?? null}
        files={exports.map(({ file, guild, exportedAt }) => ({ file, guild, exportedAt }))}
        canSave={canSave}
      />
    </>
  );
}
