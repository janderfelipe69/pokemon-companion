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
- `talent_items` e `pokemon_talent_drops`: itens e quantidades de drops (vazias; `quantity` nula = desconhecida).
- **Segurança (RLS)**: qualquer visitante lê; só administrador autenticado insere, altera ou remove.
