-- Troca de medalhas v3: "tenho" e "quero" são duas listas separadas do membro. O "quero" é uma lista única
-- (vale para todas as medalhas que o membro tem), marcada de uma vez. Rode DEPOIS do 0024. Seguro para executar mais de uma vez.
-- Os pedidos que já estavam dentro das ofertas (0024) são reunidos nessa lista única.

create table if not exists public.guild_medal_wants (
  member_id  bigint      not null references public.guild_members (id) on delete cascade,
  medal_id   integer     not null check (medal_id > 0),
  created_at timestamptz not null default now(),
  primary key (member_id, medal_id)
);

create index if not exists guild_medal_wants_medal_idx on public.guild_medal_wants (medal_id);

alter table public.guild_medal_wants enable row level security;
drop policy if exists "Leitura pública" on public.guild_medal_wants;
create policy "Leitura pública" on public.guild_medal_wants for select to anon, authenticated using (true);

-- Reúne os pedidos antigos (por oferta) na lista única, sem pedir o que o próprio membro oferece.
do $$
begin
  if to_regclass('public.guild_medal_offer_wants') is not null then
    insert into public.guild_medal_wants (member_id, medal_id)
    select distinct w.member_id, w.want_medal_id
    from public.guild_medal_offer_wants w
    where not exists (select 1 from public.guild_medal_offers o where o.member_id = w.member_id and o.medal_id = w.want_medal_id)
    on conflict do nothing;
    drop table public.guild_medal_offer_wants;
  end if;
end $$;

drop function if exists public.set_guild_medal_wants(bigint, integer, integer[]);
drop function if exists public.complete_guild_medal_trade(bigint, integer, bigint, integer, integer);

-- Avisos de troca possível: uma linha por medalha que bate entre duas pessoas, para cada uma delas.
-- direction: 'give' = eu tenho a medalha e o outro quer; 'get' = o outro tem a medalha e eu quero. Só o servidor lê e escreve.
drop table if exists public.guild_medal_notifications;
create table public.guild_medal_notifications (
  member_id  bigint      not null references public.guild_members (id) on delete cascade,
  other_id   bigint      not null references public.guild_members (id) on delete cascade,
  medal_id   integer     not null check (medal_id > 0),
  direction  text        not null check (direction in ('give', 'get')),
  read       boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, other_id, medal_id, direction)
);
create index guild_medal_notifications_unread_idx on public.guild_medal_notifications (member_id) where read = false;
alter table public.guild_medal_notifications enable row level security;

-- Coloca, tira ou muda a quantidade de uma medalha que o membro tem (0 remove).
-- GM001 = o membro já marcou essa medalha como "quero".
create or replace function public.set_guild_medal_offer(p_member_id bigint, p_medal_id integer, p_qty integer)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  if p_qty <= 0 then
    delete from public.guild_medal_offers where member_id = p_member_id and medal_id = p_medal_id;
    return;
  end if;

  if exists (select 1 from public.guild_medal_wants where member_id = p_member_id and medal_id = p_medal_id) then
    raise exception 'Medalha já está nos pedidos' using errcode = 'GM001';
  end if;

  insert into public.guild_medal_offers (member_id, medal_id, qty)
  values (p_member_id, p_medal_id, least(p_qty, 99))
  on conflict (member_id, medal_id) do update set qty = excluded.qty, updated_at = now();
end $$;

-- Troca a lista de "quero" do membro pela lista enviada (vazia = limpa), tudo ou nada.
-- GM001 = alguma medalha pedida é uma das que o membro tem; GM004 = lista grande demais.
create or replace function public.set_guild_medal_wants(p_member_id bigint, p_wants integer[])
returns void language plpgsql set search_path = '' as $$
declare
  v_wants integer[];
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  select coalesce(array_agg(distinct w), '{}') into v_wants from unnest(p_wants) as w where w > 0;
  if cardinality(v_wants) > 300 then
    raise exception 'Pedidos demais' using errcode = 'GM004';
  end if;

  if exists (select 1 from public.guild_medal_offers where member_id = p_member_id and medal_id = any (v_wants)) then
    raise exception 'Medalha já está nas ofertas' using errcode = 'GM001';
  end if;

  delete from public.guild_medal_wants where member_id = p_member_id and not (medal_id = any (v_wants));
  insert into public.guild_medal_wants (member_id, medal_id)
  select p_member_id, w from unnest(v_wants) as w
  on conflict do nothing;
end $$;

-- Troca feita: a medalha diminui de quem entregou ("tenho", some ao chegar a 0) e sai do "quero" de quem recebeu. Tudo ou nada.
-- GM002 = quem entrega não tem mais essa quantidade, ou quem recebe não pede mais essa medalha.
create or replace function public.complete_guild_medal_trade(p_giver bigint, p_receiver bigint, p_medal_id integer, p_qty integer)
returns void language plpgsql set search_path = '' as $$
declare
  v_have integer;
begin
  if p_giver = p_receiver or p_qty <= 0 then
    raise exception 'Troca inválida' using errcode = 'GM002';
  end if;

  select qty into v_have from public.guild_medal_offers where member_id = p_giver and medal_id = p_medal_id for update;

  if v_have is null or v_have < p_qty
     or not exists (select 1 from public.guild_medal_wants where member_id = p_receiver and medal_id = p_medal_id) then
    raise exception 'Troca mudou' using errcode = 'GM002';
  end if;

  if v_have = p_qty then
    delete from public.guild_medal_offers where member_id = p_giver and medal_id = p_medal_id;
  else
    update public.guild_medal_offers set qty = v_have - p_qty, updated_at = now() where member_id = p_giver and medal_id = p_medal_id;
  end if;

  delete from public.guild_medal_wants where member_id = p_receiver and medal_id = p_medal_id;
end $$;

revoke execute on function public.set_guild_medal_offer(bigint, integer, integer) from public, anon, authenticated;
grant execute on function public.set_guild_medal_offer(bigint, integer, integer) to service_role;
revoke execute on function public.set_guild_medal_wants(bigint, integer[]) from public, anon, authenticated;
grant execute on function public.set_guild_medal_wants(bigint, integer[]) to service_role;
revoke execute on function public.complete_guild_medal_trade(bigint, bigint, integer, integer) from public, anon, authenticated;
grant execute on function public.complete_guild_medal_trade(bigint, bigint, integer, integer) to service_role;

-- Tempo real na lista de "quero" (as ofertas já estão no tempo real desde o 0024).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_medal_wants') then
    alter publication supabase_realtime add table public.guild_medal_wants;
  end if;
end $$;

notify pgrst, 'reload schema';
