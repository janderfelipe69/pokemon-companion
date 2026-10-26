-- Projetos de balls da guilda: um registro por Pokémon (o estado mais recente) + o histórico de atualizações.
-- Rode DEPOIS do 0009. Seguro para executar mais de uma vez.
-- A imagem NÃO fica no banco: ela é redesenhada no site a partir dos dados (e a versão pronta vai para o Discord).

create table if not exists public.guild_ball_projects (
  id         bigint generated always as identity primary key,
  slug       text        not null unique check (char_length(slug) between 1 and 80),
  pokemon    text        not null check (btrim(pokemon) <> '' and char_length(pokemon) <= 60),
  dex_number integer     check (dex_number is null or dex_number between 1 and 99999),
  shiny      boolean     not null default false,
  total      bigint      not null default 0 check (total >= 0),
  balls      jsonb       not null default '[]'::jsonb,
  -- Arte enviada à mão (PNG pequeno em base64). Vazio = o site busca a arte oficial pelo número.
  sprite     text        check (sprite is null or char_length(sprite) <= 260000),
  created_by bigint      references public.guild_members (id) on delete set null,
  updated_by bigint      references public.guild_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guild_ball_updates (
  id         bigint generated always as identity primary key,
  project_id bigint      not null references public.guild_ball_projects (id) on delete cascade,
  member_id  bigint      references public.guild_members (id) on delete set null,
  total      bigint      not null check (total >= 0),
  balls      jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists guild_ball_updates_project_idx on public.guild_ball_updates (project_id, created_at desc);
create index if not exists guild_ball_projects_updated_idx on public.guild_ball_projects (updated_at desc);

-- Só o servidor do site (service role) lê e escreve; sem política, ninguém mais enxerga.
alter table public.guild_ball_projects enable row level security;
alter table public.guild_ball_updates enable row level security;

notify pgrst, 'reload schema';
