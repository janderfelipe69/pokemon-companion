-- Pokémon Companion — Etapa 5: esquema do banco (Supabase / PostgreSQL).
-- Pode ser executado mais de uma vez sem duplicar nada nem apagar dados.
-- Executar no painel do Supabase: SQL Editor > New query > colar > Run.

-- ============================================================
-- 1. Tabelas de referência (somente leitura pela API)
-- ============================================================
create table if not exists public.tiers (
  code       text primary key,
  sort_order smallint not null unique
);

insert into public.tiers (code, sort_order) values
  ('T1', 1), ('T2', 2), ('T3', 3), ('T4', 4), ('T5', 5), ('T6', 6), ('T7', 7),
  ('Super Rare', 8), ('Ultra Rare', 9), ('Legendary', 10), ('Mythic', 11)
on conflict (code) do nothing;

create table if not exists public.pokemon_types (
  code text primary key
);

insert into public.pokemon_types (code) values
  ('normal'), ('fire'), ('water'), ('electric'), ('grass'), ('ice'),
  ('fighting'), ('poison'), ('ground'), ('flying'), ('psychic'), ('bug'),
  ('rock'), ('ghost'), ('dragon'), ('dark'), ('steel'), ('fairy')
on conflict (code) do nothing;

-- ============================================================
-- 2. Pokémon
-- NULL em tier, listed_type e preços = "não definido" (nunca zero).
-- price_kk / price_brl = 0 é um preço cadastrado de verdade.
-- ============================================================
create table if not exists public.pokemon (
  id               text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (btrim(name) <> ''),
  variant          text check (variant is null or btrim(variant) <> ''),
  tier             text references public.tiers (code) on update cascade,
  listed_type      text references public.pokemon_types (code),
  notes            text,
  price_kk         numeric(24, 4) check (price_kk is null or price_kk >= 0),
  price_brl        numeric(18, 2) check (price_brl is null or price_brl >= 0),
  -- Origem da importação (para revisar os registros depois):
  source_name      text,      -- nome exatamente como na lista original
  source_tier_raw  text,      -- tier como escrito na fonte ("?" ou vazio incluídos)
  source_type_raw  text,      -- tipo como escrito na fonte
  source_line      integer,   -- linha na lista original
  review_notes     text,      -- anomalias encontradas na importação
  -- Calculada: some sozinha quando o administrador preenche tier e tipo.
  is_incomplete    boolean generated always as (tier is null or listed_type is null) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists pokemon_tier_idx on public.pokemon (tier);
create index if not exists pokemon_source_line_idx on public.pokemon (source_line);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists pokemon_set_updated_at on public.pokemon;
create trigger pokemon_set_updated_at before update on public.pokemon
  for each row execute function public.set_updated_at();

-- Tipos defensivos e ofensivos são independentes (duas tabelas).
create table if not exists public.pokemon_defensive_types (
  pokemon_id text not null references public.pokemon (id) on delete cascade on update cascade,
  type_code  text not null references public.pokemon_types (code),
  position   smallint not null default 0,
  primary key (pokemon_id, type_code)
);

create table if not exists public.pokemon_offensive_types (
  pokemon_id text not null references public.pokemon (id) on delete cascade on update cascade,
  type_code  text not null references public.pokemon_types (code),
  position   smallint not null default 0,
  primary key (pokemon_id, type_code)
);

-- ============================================================
-- 3. Drops de talentos (estrutura pronta; nenhum dado inserido)
-- quantity NULL = quantidade desconhecida.
-- ============================================================
create table if not exists public.talent_items (
  id   bigint generated always as identity primary key,
  name text not null unique check (btrim(name) <> '')
);

create table if not exists public.pokemon_talent_drops (
  id         bigint generated always as identity primary key,
  pokemon_id text not null references public.pokemon (id) on delete cascade on update cascade,
  item_id    bigint not null references public.talent_items (id) on delete restrict,
  quantity   integer check (quantity is null or quantity >= 0),
  unique (pokemon_id, item_id)
);

create index if not exists pokemon_talent_drops_pokemon_idx on public.pokemon_talent_drops (pokemon_id);

-- ============================================================
-- 4. Administradores
-- Só quem está nesta tabela pode escrever. A tabela só é alterada
-- pelo SQL Editor (ver supabase/README.md); a API não permite.
-- ============================================================
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ============================================================
-- 5. Row Level Security
-- Leitura pública; escrita somente para administrador autenticado.
-- ============================================================
alter table public.tiers         enable row level security;
alter table public.pokemon_types enable row level security;
alter table public.admin_users   enable row level security;

drop policy if exists "Leitura pública" on public.tiers;
create policy "Leitura pública" on public.tiers for select to anon, authenticated using (true);

drop policy if exists "Leitura pública" on public.pokemon_types;
create policy "Leitura pública" on public.pokemon_types for select to anon, authenticated using (true);

-- Cada usuário só enxerga a própria linha (para saber se é admin). Sem política de escrita.
drop policy if exists "Ver a própria linha" on public.admin_users;
create policy "Ver a própria linha" on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.admin_users from anon;

do $$
declare t text;
begin
  foreach t in array array[
    'pokemon', 'pokemon_defensive_types', 'pokemon_offensive_types',
    'talent_items', 'pokemon_talent_drops'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Leitura pública" on public.%I', t);
    execute format('create policy "Leitura pública" on public.%I for select to anon, authenticated using (true)', t);

    execute format('drop policy if exists "Admin insere" on public.%I', t);
    execute format('create policy "Admin insere" on public.%I for insert to authenticated with check (public.is_admin())', t);

    execute format('drop policy if exists "Admin atualiza" on public.%I', t);
    execute format('create policy "Admin atualiza" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);

    execute format('drop policy if exists "Admin remove" on public.%I', t);
    execute format('create policy "Admin remove" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;
