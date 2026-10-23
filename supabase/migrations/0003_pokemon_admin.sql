-- Pokémon Companion: campos extras para administração.
-- Seguro para executar novamente e preserva os dados existentes.

-- Informações adicionais do Pokémon
alter table public.pokemon
  add column if not exists pokedex_number integer
    check (pokedex_number is null or pokedex_number > 0),
  add column if not exists level integer
    check (level is null or level >= 0),
  add column if not exists game_type text,
  add column if not exists image_url text,
  add column if not exists evolution text,
  add column if not exists evolution_item text;

-- Metas de Pokélog: até três etapas por Pokémon.
create table if not exists public.pokemon_pokelog (
  pokemon_id text primary key
    references public.pokemon(id) on delete cascade on update cascade,
  stage_1 integer check (stage_1 is null or stage_1 >= 0),
  stage_2 integer check (stage_2 is null or stage_2 >= 0),
  stage_3 integer check (stage_3 is null or stage_3 >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists pokemon_pokelog_set_updated_at
  on public.pokemon_pokelog;

create trigger pokemon_pokelog_set_updated_at
before update on public.pokemon_pokelog
for each row execute function public.set_updated_at();

-- Leitura pública para exibir a Pokédex.
-- Escritas administrativas serão feitas pela API protegida do servidor.
alter table public.pokemon_pokelog enable row level security;

drop policy if exists "Leitura pública" on public.pokemon_pokelog;

create policy "Leitura pública"
on public.pokemon_pokelog
for select
to anon, authenticated
using (true);