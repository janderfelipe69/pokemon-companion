-- Trocas da rodada do boss, guardadas no banco. Depois que o site aponta uma stone para alguém, ela fica com essa
-- pessoa (nada é recalculado) e cada troca pode ser marcada como feita por quem entrega ou por quem recebe.
-- Rode DEPOIS do 0011 e do 0021. Seguro para executar mais de uma vez.

create table if not exists public.guild_boost_transfers (
  id          bigint      generated always as identity primary key,
  from_member bigint      not null references public.guild_members (id) on delete cascade,
  to_member   bigint      not null references public.guild_members (id) on delete cascade,
  type        text        not null check (type in ('normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy')),
  tier        text        not null check (tier in ('novice', 'elemental', 'common', 'enhanced', 'potent', 'advanced')),
  qty         integer     not null check (qty between 1 and 999),
  done        boolean     not null default false,
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  check (from_member <> to_member)
);

create index if not exists guild_boost_transfers_created_at_idx on public.guild_boost_transfers (created_at);
create index if not exists guild_boost_transfers_from_idx on public.guild_boost_transfers (from_member);
create index if not exists guild_boost_transfers_to_idx on public.guild_boost_transfers (to_member);

alter table public.guild_boost_transfers enable row level security;

drop policy if exists "Leitura pública" on public.guild_boost_transfers;
create policy "Leitura pública" on public.guild_boost_transfers for select to anon, authenticated using (true);

-- Só o servidor do site (service role) escreve. Entra no tempo real para o plano e os "feito" aparecerem na hora.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_boost_transfers') then
    alter publication supabase_realtime add table public.guild_boost_transfers;
  end if;
end $$;

notify pgrst, 'reload schema';
