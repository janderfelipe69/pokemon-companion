import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { saveGuildExport } from "@/lib/guild/files";
import { parseGuildExport } from "@/lib/guild/parse";

export const runtime = "nodejs";

/** Salva um JSON de guilda na pasta data/guild. Só para quem está logado na Administração. */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Entre na Administração para salvar na pasta." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) {
    return NextResponse.json({ error: "Arquivo grande demais (máximo 1 MB)." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  let data;
  try {
    data = parseGuildExport(body);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Arquivo inválido." }, { status: 400 });
  }

  try {
    const file = await saveGuildExport(data);
    return NextResponse.json({ ok: true, file });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "EEXIST") {
      return NextResponse.json({ error: "Essa exportação já está na pasta." }, { status: 409 });
    }
    if (e instanceof Error && e.message.startsWith('O arquivo precisa ter "exportedAt"')) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          "Não foi possível gravar na pasta data/guild. Em hospedagens com disco somente leitura (como a Vercel), coloque o arquivo na pasta e publique de novo.",
      },
      { status: 500 },
    );
  }
}
