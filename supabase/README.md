# Supabase — passo a passo (plano gratuito)

Nada aqui está conectado ainda: você precisa fazer os passos abaixo no painel do Supabase.
Sem as variáveis de ambiente, o site continua funcionando normalmente com os arquivos do projeto.

## 1. Criar o projeto
1. Entre em https://supabase.com e crie uma conta (plano **Free**, sem cartão).
2. **New project**: escolha nome, senha do banco (guarde-a) e a região mais próxima.
3. Observação do plano gratuito: projetos sem uso por cerca de 1 semana podem ser pausados e reativados pelo painel.

## 2. Criar as tabelas e as políticas (RLS)
1. Painel > **SQL Editor** > **New query**.
2. Cole todo o conteúdo de `supabase/migrations/0001_schema.sql` e clique em **Run**.
3. Pode rodar de novo sem problema (não duplica nem apaga nada).

## 3. Importar os 854 registros
1. Nova query no SQL Editor: cole `supabase/seed/0002_pokemon.sql` e clique em **Run**.
2. O último resultado mostra a conferência. Esperado: `registros 854 | sem_tier 58 | sem_tipo 60 | para_revisao 66 | com_preco 0`.
3. **Pode rodar de novo**: nada é duplicado e nada que você editou no banco é sobrescrito (registros usam `ON CONFLICT (id) DO NOTHING`; preços só preenchem campos ainda vazios).
4. Se mudar `src/data/pokemonSource.ts` ou `src/data/prices.ts`, regenere o arquivo com `npm run db:seed:generate` e rode-o de novo. Registros novos entram; os já existentes no banco não são alterados.

## 4. Ligar o site ao banco
1. Painel > **Project Settings > API**: copie a **Project URL** e a chave **anon** (ou *publishable*).
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Rode `npm run dev`. Em Tiers e valores, o aviso no topo passa a dizer "lidos do banco de dados".
4. **Nunca** use a chave `service_role` no projeto.

## 5. Criar o administrador (para a próxima etapa)
1. Painel > **Authentication > Users > Add user**: crie seu usuário (e-mail e senha) e copie o **UID**.
2. No SQL Editor: `insert into public.admin_users (user_id) values ('COLE-O-UID-AQUI');`
3. Só quem está em `admin_users` poderá escrever nos dados. Essa tabela não é editável pela API do site.

## Como o banco funciona
- `pokemon`: um registro por Pokémon/variante. `id` é o mesmo identificador do projeto (ex.: `shiny-bulbasaur`). Campos: nome, variante, `tier`, `listed_type`, observações, `price_kk` e `price_brl`.
- **Preço**: `NULL` = não definido; `0` = preço zero cadastrado. KK e R$ são independentes.
- **Origem da importação**: `source_name`, `source_tier_raw`, `source_type_raw`, `source_line` e `review_notes` guardam o que estava na lista original. `is_incomplete` é calculada (tier ou tipo nulo) e some quando o registro é completado.
- `tiers` (11 categorias) e `pokemon_types` (18 tipos): tabelas de referência, somente leitura pela API.
- `pokemon_defensive_types` e `pokemon_offensive_types`: tipos defensivos e ofensivos independentes.
- `talent_items` e `pokemon_talent_drops`: itens (agora com imagem, ver `0006_talents.sql`) e quantidades de drops (`quantity` nula = desconhecida).
- `talents` e `talent_requirements` (`0006_talents.sql`): os talentos de cada categoria e os itens que cada um pede. As imagens ficam no bucket público `talent-items` do Storage.
- `pokemon_talent_drops` (`0007_pokemon_drops.sql`): agora guarda zona (base/wildscape/primal), quantidade mínima e máxima, chance em % ou "muito raro". Um item por Pokémon em cada zona.
- `team_pool` (`0008_team_pool.sql`): lista de Pokémon úteis de cada tipo de time do Montador (hoje só o `economico`). Com pelo menos 1 Pokémon na lista, o montador sorteia só entre eles; lista vazia = usa todos os tiers do tipo de time.
- `guild_members` e `guild_boost_wants` (`0009_guild_boosts.sql`): nicks dos membros da guilda e os tipos de stone que cada um quer receber (botão flutuante Guilda). Já vêm com os membros do JSON da guilda e as escolhas da lista manual. Senha dos membros: `1`, ou o valor da variável `GUILD_MEMBER_PASSWORD` se você criar na Vercel.
- `guild_boost_wants.tiers` (`0010_guild_boost_tiers.sql`, rodar depois do 0009): além do tipo, cada membro escolhe quais níveis de stone quer (Novice a Advanced). Quem já tinha tipos escolhidos continua com todos os níveis até editar.
- `guild_boost_drops` (`0011_guild_boost_drops.sql`, rodar depois do 0010): drops que os membros publicam depois do boss. O drop some sozinho às 3h da manhã (Brasília) seguinte; publicar de novo substitui o anterior. Alimenta o plano de trocas da aba "Drops do boss".
- `guild_discord_rounds` (`0012_guild_discord_rounds.sql`, rodar depois do 0011): guarda o id da mensagem que o site posta no Discord em cada rodada, para editar a mesma mensagem. Só é usada se `DISCORD_WEBHOOK_URL` estiver configurada.
- **Segurança (RLS)**: qualquer visitante lê; só administrador autenticado insere, altera ou remove.
