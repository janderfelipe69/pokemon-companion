-- Drops publicados pelos membros depois do boss. Cada publicação vale 24 horas e depois some sozinha.
-- Rode DEPOIS do 0009 e do 0010. Seguro para executar mais de uma vez.

create table if not exists public.guild_boost_drops (
  member_id bigint      not null references public.guild_members (id) on delete cascade,
  type      text        not null check (type in ('normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy')),
  tier      text        not null check (tier in ('novice', 'elemental', 'common', 'enhanced', 'potent', 'advanced')),
  qty       integer     not null check (qty between 1 and 999),
  posted_at timestamptz not null default now(),
  primary key (member_id, type, tier)
);

create index if not exists guild_boost_drops_posted_at_idx on public.guild_boost_drops (posted_at);

alter table public.guild_boost_drops enable row level security;

drop policy if exists "Leitura pública" on public.guild_boost_drops;
create policy "Leitura pública" on public.guild_boost_drops for select to anon, authenticated using (true);

-- Troca TUDO que o membro tinha publicado pela lista enviada (tudo ou nada) e já limpa o que passou de 24h.
-- p_drops: [{ "type": "fire", "tier": "advanced", "qty": 2 }, ...]. Lista vazia = retira o que ele tinha publicado.
create or replace function public.publish_guild_drops(p_member_id bigint, p_drops jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  delete from public.guild_boost_drops
  where member_id = p_member_id or posted_at < now() - interval '24 hours';

  insert into public.guild_boost_drops (member_id, type, tier, qty)
  select p_member_id, d ->> 'type', d ->> 'tier', (d ->> 'qty')::integer
  from jsonb_array_elements(p_drops) as d;
end $$;

revoke execute on function public.publish_guild_drops(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.publish_guild_drops(bigint, jsonb) to service_role;

notify pgrst, 'reload schema';
