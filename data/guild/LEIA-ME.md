# Pasta data/guild

Coloque aqui os JSONs exportados da guilda, um por dia, por exemplo:

    GuildMembers_T_R_U_E_2026-10-23_181640.json

- A página **/guilda** lê esta pasta a cada acesso e mostra a exportação **mais recente**.
- O seletor "Exportação da pasta" permite abrir dias anteriores.
- A exportação imediatamente anterior é usada para mostrar a variação de nível (+N / -N)
  e quem entrou ou saiu da guilda.
- O nome do arquivo não importa; a data vem do campo `exportedAt` dentro do JSON.
- Arquivos que não seguirem o formato (`guild`, `exportedAt`, `members[]` com
  `name`, `rank`, `level`, `status`, `lastLogin`, `points`, `contribution`) são ignorados
  e listados num aviso na página.

Regras de pontuação: `src/lib/guild/board.ts` (constante `GUILD_RULES`).
Desenho da imagem: `src/lib/guild/render.ts`.
