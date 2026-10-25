-- Boosts da guilda: membros e os tipos de stone que cada um quer receber.
-- Seguro para executar mais de uma vez: não apaga nem sobrescreve o que já foi editado.
-- Os membros e as escolhas iniciais só entram na PRIMEIRA execução (com a tabela de membros vazia).

create table if not exists public.guild_members (
  id         bigint generated always as identity primary key,
  name       text not null check (btrim(name) <> '' and char_length(name) <= 40),
  created_at timestamptz not null default now()
);
-- Nick único, sem diferenciar maiúsculas de minúsculas.
create unique index if not exists guild_members_name_key on public.guild_members (lower(btrim(name)));

create table if not exists public.guild_boost_wants (
  member_id bigint not null references public.guild_members (id) on delete cascade,
  type      text   not null check (type in ('normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy')),
  primary key (member_id, type)
);

alter table public.guild_members enable row level security;
alter table public.guild_boost_wants enable row level security;

drop policy if exists "Leitura pública" on public.guild_members;
create policy "Leitura pública" on public.guild_members for select to anon, authenticated using (true);

drop policy if exists "Leitura pública" on public.guild_boost_wants;
create policy "Leitura pública" on public.guild_boost_wants for select to anon, authenticated using (true);

-- Escritas (escolher boosts, adicionar e remover membros) são feitas pelas rotas protegidas do servidor.

-- Troca os tipos escolhidos por um membro pela lista enviada (tudo ou nada). Lista vazia = limpa.
create or replace function public.save_guild_wants(p_member_id bigint, p_types text[])
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  delete from public.guild_boost_wants where member_id = p_member_id and not (type = any (p_types));

  insert into public.guild_boost_wants (member_id, type)
  select p_member_id, t from unnest(p_types) as t
  on conflict do nothing;
end $$;

revoke execute on function public.save_guild_wants(bigint, text[]) from public, anon, authenticated;
grant execute on function public.save_guild_wants(bigint, text[]) to service_role;

-- ============================================================
-- Dados iniciais: os 30 membros do JSON exportado do jogo (2026-10-25) e os tipos que
-- cada um já tinha escolhido na lista manual. Só roda se ainda não houver nenhum membro.
-- (Vituuu estava na lista manual, mas não está no JSON da guilda: não foi incluído.)
-- ============================================================
do $$
begin
  if not exists (select 1 from public.guild_members) then
    insert into public.guild_members (name) values
    ('T R U E'),
    ('Rochman'),
    ('Harsezin'),
    ('S K O L'),
    ('Itallones'),
    ('Shesally'),
    ('Giapaige'),
    ('Syni'),
    ('Pablo Lafayete'),
    ('Bolaq'),
    ('Raegor'),
    ('Divinex'),
    ('Pedradinha'),
    ('Leafah Althers'),
    ('Herts'),
    ('Nabs'),
    ('Raveex'),
    ('V H N'),
    ('Richslime'),
    ('Kaliskiann'),
    ('Kamakasy'),
    ('Nobs'),
    ('Thony'),
    ('Cassetin'),
    ('Nicolas Maduro'),
    ('Horozinho'),
    ('Cryt'),
    ('Galenoo'),
    ('Update Sem Where'),
    ('Dantyzin');

    insert into public.guild_boost_wants (member_id, type)
    select m.id, v.type
    from (values
    ('T R U E', 'normal'),
    ('T R U E', 'ghost'),
    ('T R U E', 'dark'),
    ('T R U E', 'dragon'),
    ('Rochman', 'grass'),
    ('Rochman', 'poison'),
    ('Harsezin', 'normal'),
    ('Harsezin', 'water'),
    ('Harsezin', 'flying'),
    ('S K O L', 'fairy'),
    ('S K O L', 'fighting'),
    ('S K O L', 'psychic'),
    ('Shesally', 'normal'),
    ('Shesally', 'ghost'),
    ('Shesally', 'dark'),
    ('Shesally', 'dragon'),
    ('Shesally', 'fairy'),
    ('Syni', 'electric'),
    ('Pablo Lafayete', 'fire'),
    ('Pablo Lafayete', 'flying'),
    ('Pablo Lafayete', 'fighting'),
    ('Bolaq', 'electric'),
    ('Bolaq', 'rock'),
    ('Bolaq', 'normal'),
    ('Bolaq', 'ground'),
    ('Raegor', 'fire'),
    ('Raegor', 'flying'),
    ('Raegor', 'fighting'),
    ('Pedradinha', 'fighting'),
    ('Pedradinha', 'water'),
    ('Herts', 'grass'),
    ('Herts', 'poison'),
    ('V H N', 'fairy'),
    ('V H N', 'fighting'),
    ('V H N', 'normal'),
    ('V H N', 'bug'),
    ('Kaliskiann', 'poison'),
    ('Kaliskiann', 'fighting'),
    ('Cassetin', 'fire'),
    ('Cassetin', 'flying'),
    ('Cassetin', 'fighting'),
    ('Cassetin', 'steel'),
    ('Galenoo', 'fighting'),
    ('Update Sem Where', 'electric')
    ) as v(name, type)
    join public.guild_members m on lower(btrim(m.name)) = lower(v.name);
  end if;
end $$;

-- Faz a API do Supabase enxergar as tabelas novas na hora.
notify pgrst, 'reload schema';
