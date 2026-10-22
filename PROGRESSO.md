# Pokémon Companion — Progresso

## Etapa 1 — Estrutura visual inicial (concluída)

### O que foi feito
- Projeto criado do zero com Next.js (App Router), TypeScript e Tailwind CSS v4.
- Tema escuro com paleta definida em `src/app/globals.css` (tokens: `ink`, `panel`, `raised`, `line`, `fg`, `muted`, `gold`, `teal`).
- Menu lateral fixo no desktop e em gaveta no celular, com ícones e nomes.
- Dashboard com identidade do projeto, aviso de desenvolvimento, cards de resumo (marcados como "Exemplo") e atalhos.
- Páginas das 7 seções e da Administração, todas com mensagem de "em breve".
- Única dependência extra: `lucide-react` (ícones).
- Fonte do sistema (sem download externo).

### Arquivos principais
- `src/config/navigation.ts` — lista única dos itens de menu (edite aqui para adicionar seções).
- `src/components/layout/` — `AppShell`, `Sidebar`, `Header`, `Logo`.
- `src/components/ui/` — `Card`, `Badge`, `StatCard`, `ShortcutCard`, `PageHeader`, `PlaceholderPage`.
- `src/app/page.tsx` — Dashboard.
- `src/app/{pokedex,tiers,drops,pokelog,rotas-farm,montador-times,admin}/page.tsx` — páginas provisórias.

### Comandos
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de produção
npm run lint     # checagem de tipos (tsc)
```

### Verificação feita
- `tsc --noEmit` e `next build` sem erros.
- Todas as 8 rotas retornam HTTP 200 no servidor de desenvolvimento.
- Não foi feita inspeção visual em navegador.

### Fora do escopo (não implementado)
Banco de dados, login, CRUD, importação, rotas de farm reais, cálculo de times.

### Próximo passo sugerido
Implementar a Pokédex: definir o formato dos dados de Pokémon e criar a listagem com busca e página de detalhes.

---

## Etapa 2 — Pokédex visual e estrutura dos dados (concluída)

### O que foi feito
- Modelo tipado `Pokemon` com ID único, nome, variante, tipos defensivos, tipos ofensivos (independentes), tier, valor estimado e observações (os três últimos opcionais).
- Dados de demonstração em arquivo separado, com 12 Pokémon fictícios (nomes terminados em "Demo"), marcados com `isDemo` e com selo "Demo" no card.
- Pokédex com cards (nome, variante, tipos de defesa e de ataque), busca por nome (ignora acentos e maiúsculas), filtro por tipo defensivo, filtro por tipo ofensivo e contador de resultados.
- Estado vazio com botão "Limpar busca e filtros".
- Nenhuma dependência nova. Nenhuma outra página foi alterada.

### Arquivos criados
- `src/types/pokemon.ts` — tipos `Pokemon`, `PokemonType`, `TalentDrop` e lista `POKEMON_TYPES`.
- `src/data/demoPokemon.ts` — dados de demonstração.
- `src/config/pokemonTypes.ts` — nome em português e cor de cada tipo.
- `src/lib/pokemonFilters.ts` — lógica de busca e filtros (função pura).
- `src/components/pokedex/` — `PokedexBrowser`, `PokemonCard`, `TypeBadge`, `TypeSelect`.
- `src/components/ui/EmptyState.tsx` — estado vazio reutilizável.

### Arquivo modificado
- `src/app/pokedex/page.tsx` — agora usa a listagem no lugar do aviso "em breve".

### Preparado, mas não implementado
- `tier` e `estimatedValue` existem no modelo, mas ainda não aparecem na interface.
- `talentDrops` (item e quantidade) está tipado e reservado para a etapa de drops.

### Verificação feita
- `npm run lint` e `npm run build` sem erros.
- Lógica de filtros testada com casos de busca, acentos, filtros combinados e resultado vazio.
- As 8 rotas retornam HTTP 200 e a página da Pokédex renderiza os dados de demonstração.
- Não foi feita inspeção visual em navegador.

### Pendente
- Dados reais de Pokémon (nenhum foi inventado como oficial).
- Exibição de tier e valor, página de detalhes, imagens e ordenação.
- Tiers e valores, drops de talentos, Pokélog, rotas de farm, montador de times, banco de dados e administração.

### Próximo passo recomendado
Etapa 3: definir a origem dos dados reais (arquivo, planilha ou banco) e implementar a página de Tiers e valores, reaproveitando o modelo e o `EmptyState`.

---

## Etapa 3 — Tiers e importação da lista (concluída)

### Formato da fonte
3 colunas (separadas por tabulação): **Nome, Tier, Tipo**. Há um único tipo por Pokémon, sem distinção entre defensivo e ofensivo. Por isso o tipo foi guardado em `listedType` e **não** foi copiado para `defensiveTypes`/`offensiveTypes` (que ficam vazios nos registros importados).

### O que foi feito
- `Tier` com exatamente as 11 categorias (T1–T7, Super Rare, Ultra Rare, Legendary, Mythic). Tier não definido = `null`, mostrado em categoria própria.
- Lista original gravada em `src/data/pokemonSource.ts` (texto, uma linha por registro). Para atualizar, edite esse texto.
- Parser com validação (`src/lib/importPokemon.ts`): nome preservado em `sourceName`; "Shiny" e "Mega" também viram `variant`; `?` e vazio viram `null`; anomalias vão para `importIssues`.
- Página Tiers e valores: contagem por tier (clicável como filtro), busca, filtro por tier e por tipo, ordem da lista ou A–Z, seções recolhíveis, categoria "Tier não definido" e estado vazio.
- Cores dos tiers centralizadas em `src/config/tiers.ts` (não são cores oficiais).
- Pokédex da Etapa 2 continua com os dados de demonstração e não foi alterada.

### Arquivos
Criados: `src/data/pokemonSource.ts`, `src/data/pokemon.ts`, `src/lib/importPokemon.ts`, `src/lib/tierFilters.ts`, `src/config/tiers.ts`, `src/components/tiers/TiersBrowser.tsx`.
Modificados: `src/types/pokemon.ts` (Tier, `tier`, `sourceName`, `listedType`), `src/lib/pokemonFilters.ts` (`normalize` exportada), `src/app/tiers/page.tsx`.

### Contagens (854 registros)
- Tier definido: 796. Sem tier: 58.
- T1 89, T2 119, T3 112, T4 149, T5 157, T6 84, T7 18, Super Rare 32, Ultra Rare 15, Legendary 18, Mythic 3.
- Sem tipo: 60. Com tier **ou** tipo indefinido (para revisão): 66.
- 423 Shiny e 5 Mega.

### Para revisão
- Campo vazio (e não "?"): Audino (tipo), Shiny Audino (tier e tipo).
- Tier definido e tipo "?": Shiny Smeargle, Volbeat, Shiny Volbeat, Illumise, Shiny Illumise, Gulpin, Shiny Gulpin (e Audino, tipo vazio).
- Tipo definido e tier "?": Shinx, Shiny Shinx, Luxio, Shiny Luxio, Lopuny, Shiny Lopuny.
- "Lopuny" parece erro de digitação de outro nome; foi mantido como está na fonte.
- Os demais 52 registros têm tier e tipo "?" (lendários, fósseis e outros).

### Verificação
`npm run lint` e `npm run build` sem erros; 8 rotas com HTTP 200; IDs únicos (854); soma por tier confere com o total.

### Pendente / próximo passo
Preços e valores, drops de talentos, Pokélog, rotas de farm, montador de times, banco de dados, administração. Próximo passo sugerido: Etapa de valores (preço por Pokémon), reaproveitando `estimatedValue`.

---

## Etapa 4 — Preços em KK e R$ (concluída)

### O que foi feito
- Dois preços independentes por Pokémon: `priceKk` e `priceBrl`. Nada é convertido de um para o outro.
- Representação: **texto decimal canônico** (ex.: `"1500"`, `"2.5"`), sem ponto flutuante e sem limite prático de tamanho. KK aceita até 4 casas decimais e R$ até 2; até 15 dígitos inteiros.
- `null` = não definido (exibido como "Não definido"). `"0"` é um preço cadastrado e é diferente de ausente.
- Preços ficam em arquivo próprio, `src/data/prices.ts`, indexados pelo ID. **Está vazio**: a lista original não traz preços e nenhum foi inventado.
- `estimatedValue` (número sem moeda, nunca usado) foi removido do modelo e substituído pelos dois campos.
- Nova aba "Tabela de valores" em `/tiers/valores` (a aba "Por tier" é a página anterior). Colunas: nome e variante, tier, tipo, KK e R$. Em celular, cada linha vira um cartão.
- Busca, filtro por tier e por tipo, filtro Todos / Somente com preço / Somente sem preço, ordenação (lista, A–Z, KK, R$), direção crescente/decrescente para KK e R$, e contadores (com preço, sem preço, com KK, com R$). Preço não definido fica sempre no fim.
- Funções reutilizáveis: `formatKk`, `formatBrl`, `parsePrice`, `compareDecimal` (`src/lib/money.ts`) e `updatePrices`, `applyPrices` (`src/lib/prices.ts`).

### Edição: limitação importante
`updatePrices(prices, knownIds, id, { kk, brl })` valida o ID e os valores e devolve um **novo mapa em memória**; ela **não grava nada**. Só lê `kk` e `brl`, então não consegue alterar nome, tier ou tipo. Se qualquer valor for inválido, nada muda. **Não há botão de edição** e **nada é persistente**: sem banco de dados e sem login, qualquer alteração se perderia ao recarregar. Por enquanto, preços só entram editando `src/data/prices.ts` à mão.

### Arquivos
Criados: `src/lib/money.ts`, `src/lib/prices.ts`, `src/lib/priceFilters.ts`, `src/data/prices.ts`, `src/components/tiers/PricesBrowser.tsx`, `src/components/tiers/TiersTabs.tsx`, `src/app/tiers/valores/page.tsx`.
Modificados: `src/types/pokemon.ts` (tipos de preço, remoção de `estimatedValue`), `src/data/pokemon.ts` (exporta `pokemonWithPrices`), `src/lib/tierFilters.ts` (exporta `compareByName`), `src/app/tiers/page.tsx` (abas e texto).
Preservados sem alteração: os 854 registros, `pokemonSource.ts` e o importador (incluindo os 66 registros em revisão), a Pokédex e as demais páginas.

### Verificação
`npm run lint` e `npm run build` sem erros; 9 rotas com HTTP 200; 854 linhas na tabela. Lógica testada com preços sintéticos (não gravados): validação, zero diferente de ausente, ordenação crescente/decrescente, filtros, contadores, e nome/tier/tipo intactos após atualizar preços.

### Pendente / próximo passo
Banco de dados e autenticação, e então a área de administração para cadastrar preços. Depois: drops de talentos, Pokélog, rotas de farm, montador de times.

---

## Etapa 5 — Preparação do Supabase (concluída no código; conexão depende de você)

**O banco NÃO está conectado nem populado.** Os passos manuais estão em `supabase/README.md`. Sem as variáveis de ambiente, o site usa os arquivos do projeto, como antes.

### O que foi feito
- Esquema SQL com RLS: `supabase/migrations/0001_schema.sql` (tabelas `pokemon`, `tiers`, `pokemon_types`, tipos defensivos e ofensivos separados, `talent_items`, `pokemon_talent_drops`, `admin_users`, função `is_admin()`).
- Preço `NULL` = não definido; `0` = preço zero. Origem da importação preservada (`source_name`, `source_tier_raw`, `source_type_raw`, `source_line`, `review_notes`); `is_incomplete` calculada.
- Importação: `npm run db:seed:generate` gera `supabase/seed/0002_pokemon.sql` (854 registros). Idempotente: não duplica e não sobrescreve edições. Sem chaves secretas (o SQL é colado no SQL Editor).
- Cliente: `@supabase/supabase-js` (única dependência nova), `src/lib/supabase/{config,client,catalog}.ts`. Só chave pública; `service_role` nunca é usada.
- `getCatalog()` lê do Supabase e usa os arquivos do projeto se não houver configuração, se houver erro ou se a tabela estiver vazia. Páginas Tiers e Tabela de valores passam a usá-la (revalidam a cada 60 s) e informam a fonte dos dados. O visual não mudou.
- `.env.example` criado e `.gitignore` protege `.env*`.
- O parser agora guarda a origem de cada linha (`source` no modelo).

### Testes executados
- `npm run lint` e `npm run build` sem erros; 9 rotas HTTP 200.
- SQL em PostgreSQL 16 local (com `auth` e papéis simulados): esquema 2x e seed 2x sem erro e sem duplicar (854); 11 tiers e 18 tipos.
- RLS: visitante só lê e não vê `admin_users`; usuário comum não escreve nem se torna admin; admin edita; tier inválido e preço negativo rejeitados; tiers e `admin_users` não editáveis pela API; zero diferente de nulo; re-seed preserva edições; exclusão em cascata funciona.
- Cliente contra um servidor simulado do PostgREST (não é o Supabase real): leitura paginada (1854 linhas em 2 requisições), 854/854 idênticos aos arquivos, preços convertidos sem perda, valores inválidos viram nulo, fallback com servidor inacessível e sem variáveis.
- **Não testado**: conexão com um projeto Supabase real e login (não há credenciais).

### Pendente
Seus passos manuais (criar projeto, rodar os dois SQL, preencher `.env.local`, criar o administrador). Depois: login, área administrativa protegida (editar preços, tiers, tipos, observações), cadastro de drops, publicação, Pokélog, rotas de farm, montador de times. A Pokédex segue com dados de demonstração.
