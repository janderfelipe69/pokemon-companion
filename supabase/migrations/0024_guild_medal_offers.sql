-- Troca de medalhas v2: em vez de duas listas soltas (tenho / quero), cada medalha que o membro OFERECE vira um
-- "card" e o que ele aceita em troca daquela medalha fica dentro dele. Rode DEPOIS do 0023. Seguro para executar mais de uma vez.
-- As ofertas ("tenho") que já existiam são mantidas; os "quero" soltos deixam de existir (agora são escolhidos dentro de cada oferta).

create table if not exists public.guild_medal_offers (
  member_id  bigint      not null references public.guild_members (id) on delete cascade,
  medal_id   integer     not null check (medal_id > 0),
  qty        integer     not null check (qty between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (member_id, medal_id)
);

-- O que o membro aceita receber em troca de cada oferta dele. Apagar a oferta apaga estas linhas junto.
create table if not exists public.guild_medal_offer_wants (
  member_id      bigint  not null,
  medal_id       integer not null,
  want_medal_id  integer not null check (want_medal_id > 0 and want_medal_id <> medal_id),
  primary key (member_id, medal_id, want_medal_id),
  foreign key (member_id, medal_id) references public.guild_medal_offers (member_id, medal_id) on delete cascade
);

create index if not exists guild_medal_offer_wants_want_idx on public.guild_medal_offer_wants (want_medal_id);

alter table public.guild_medal_offers enable row level security;
alter table public.guild_medal_offer_wants enable row level security;

drop policy if exists "Leitura pública" on public.guild_medal_offers;
create policy "Leitura pública" on public.guild_medal_offers for select to anon, authenticated using (true);
drop policy if exists "Leitura pública" on public.guild_medal_offer_wants;
create policy "Leitura pública" on public.guild_medal_offer_wants for select to anon, authenticated using (true);

-- Converte o modelo antigo (se ainda existir) e remove o que não vale mais.
do $$
begin
  if to_regclass('public.guild_medal_listings') is not null then
    insert into public.guild_medal_offers (member_id, medal_id, qty)
    select member_id, medal_id, qty from public.guild_medal_listings where kind = 'have'
    on conflict do nothing;
    drop table public.guild_medal_listings;
  end if;
end $$;

drop function if exists public.set_guild_medal_listing(bigint, integer, text, integer);
drop function if exists public.complete_guild_medal_trade(bigint, bigint, integer, integer);

-- Avisos de troca possível (agora por par de ofertas). Só o servidor do site lê e escreve.
drop table if exists public.guild_medal_notifications;
create table public.guild_medal_notifications (
  member_id    bigint      not null references public.guild_members (id) on delete cascade,
  other_id     bigint      not null references public.guild_members (id) on delete cascade,
  my_medal     integer     not null check (my_medal > 0),
  their_medal  integer     not null check (their_medal > 0),
  read         boolean     not null default false,
  created_at   timestamptz not null default now(),
  primary key (member_id, other_id, my_medal, their_medal)
);
create index guild_medal_notifications_unread_idx on public.guild_medal_notifications (member_id) where read = false;
alter table public.guild_medal_notifications enable row level security;

-- Coloca, tira ou muda a quantidade de uma oferta (0 remove, junto com o que ela aceitava em troca).
-- GM001 = o membro já tem essa medalha na lista de "aceito em troca" de alguma oferta dele.
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

  if exists (select 1 from public.guild_medal_offer_wants where member_id = p_member_id and want_medal_id = p_medal_id) then
    raise exception 'Medalha já está nos pedidos' using errcode = 'GM001';
  end if;

  insert into public.guild_medal_offers (member_id, medal_id, qty)
  values (p_member_id, p_medal_id, least(p_qty, 99))
  on conflict (member_id, medal_id) do update set qty = excluded.qty, updated_at = now();
end $$;

-- Troca tudo que a oferta aceita em troca pela lista enviada (vazia = aceita qualquer proposta).
-- GM003 = a oferta não existe; GM001 = alguma medalha pedida é uma das ofertas do próprio membro; GM004 = lista grande demais.
create or replace function public.set_guild_medal_wants(p_member_id bigint, p_medal_id integer, p_wants integer[])
returns void language plpgsql set search_path = '' as $$
declare
  v_wants integer[];
begin
  if not exists (select 1 from public.guild_medal_offers where member_id = p_member_id and medal_id = p_medal_id) then
    raise exception 'Oferta não existe' using errcode = 'GM003';
  end if;

  select coalesce(array_agg(distinct w), '{}') into v_wants from unnest(p_wants) as w where w > 0 and w <> p_medal_id;
  if cardinality(v_wants) > 60 then
    raise exception 'Pedidos demais' using errcode = 'GM004';
  end if;

  if exists (select 1 from public.guild_medal_offers where member_id = p_member_id and medal_id = any (v_wants)) then
    raise exception 'Medalha já está nas ofertas' using errcode = 'GM001';
  end if;

  delete from public.guild_medal_offer_wants where member_id = p_member_id and medal_id = p_medal_id and not (want_medal_id = any (v_wants));
  insert into public.guild_medal_offer_wants (member_id, medal_id, want_medal_id)
  select p_member_id, p_medal_id, w from unnest(v_wants) as w
  on conflict do nothing;
end $$;

-- Troca feita entre duas ofertas: as DUAS diminuem na mesma quantidade e somem se chegarem a 0 (tudo ou nada).
-- GM002 = alguma oferta mudou ou sumiu.
create or replace function public.complete_guild_medal_trade(p_member_a bigint, p_medal_a integer, p_member_b bigint, p_medal_b integer, p_qty integer)
returns void language plpgsql set search_path = '' as $$
declare
  v_qty_a integer;
  v_qty_b integer;
begin
  if p_member_a = p_member_b or p_qty <= 0 then
    raise exception 'Troca inválida' using errcode = 'GM002';
  end if;

  -- Trava as duas ofertas sempre na mesma ordem para duas trocas simultâneas não se travarem uma à outra.
  perform 1 from public.guild_medal_offers
    where (member_id = p_member_a and medal_id = p_medal_a) or (member_id = p_member_b and medal_id = p_medal_b)
    order by member_id, medal_id for update;

  select qty into v_qty_a from public.guild_medal_offers where member_id = p_member_a and medal_id = p_medal_a;
  select qty into v_qty_b from public.guild_medal_offers where member_id = p_member_b and medal_id = p_medal_b;

  if v_qty_a is null or v_qty_b is null or v_qty_a < p_qty or v_qty_b < p_qty then
    raise exception 'Quantidade mudou' using errcode = 'GM002';
  end if;

  if v_qty_a = p_qty then
    delete from public.guild_medal_offers where member_id = p_member_a and medal_id = p_medal_a;
  else
    update public.guild_medal_offers set qty = v_qty_a - p_qty, updated_at = now() where member_id = p_member_a and medal_id = p_medal_a;
  end if;

  if v_qty_b = p_qty then
    delete from public.guild_medal_offers where member_id = p_member_b and medal_id = p_medal_b;
  else
    update public.guild_medal_offers set qty = v_qty_b - p_qty, updated_at = now() where member_id = p_member_b and medal_id = p_medal_b;
  end if;
end $$;

revoke execute on function public.set_guild_medal_offer(bigint, integer, integer) from public, anon, authenticated;
grant execute on function public.set_guild_medal_offer(bigint, integer, integer) to service_role;
revoke execute on function public.set_guild_medal_wants(bigint, integer, integer[]) from public, anon, authenticated;
grant execute on function public.set_guild_medal_wants(bigint, integer, integer[]) to service_role;
revoke execute on function public.complete_guild_medal_trade(bigint, integer, bigint, integer, integer) from public, anon, authenticated;
grant execute on function public.complete_guild_medal_trade(bigint, integer, bigint, integer, integer) to service_role;

-- Tempo real nas duas tabelas (leitura pública).
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['guild_medal_offers', 'guild_medal_offer_wants'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

notify pgrst, 'reload schema';
