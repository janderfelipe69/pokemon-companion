-- Banner da guilda: qual está em uso e qual o nível da guilda (os banners liberam conforme o nível).
-- Rode DEPOIS dos anteriores. Seguro para executar mais de uma vez.
-- Uma única linha (id = 1). Só o servidor do site (service role) lê e escreve, e só o admin altera pelo painel /admin.

create table if not exists public.guild_settings (
  id          smallint    primary key default 1 check (id = 1),
  banner      text        not null default 'charizard' check (char_length(banner) between 1 and 40),
  guild_level integer     not null default 16 check (guild_level between 0 and 99),
  updated_at  timestamptz not null default now()
);

-- Estado atual da guilda: usando o Charizard (liberado no nível 16).
insert into public.guild_settings (id) values (1) on conflict (id) do nothing;

alter table public.guild_settings enable row level security;

notify pgrst, 'reload schema';
