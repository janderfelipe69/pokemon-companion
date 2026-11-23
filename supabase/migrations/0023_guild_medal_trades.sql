-- Troca de medalhas da guilda: cada membro lista as medalhas que TEM para trocar ("have") e as que QUER ("want"),
-- com quantidade. Os "matches" (quem tem o que eu quero / quem quer o que eu tenho) são calculados pelo site.
-- Rode DEPOIS do 0009 e do 0021. Seguro para executar mais de uma vez.

create table if not exists public.guild_medal_listings (
  member_id  bigint      not null references public.guild_members (id) on delete cascade,
  medal_id   integer     not null check (medal_id > 0),
  kind       text        not null check (kind in ('have', 'want')),
  qty        integer     not null check (qty between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (member_id, medal_id, kind)
);

create index if not exists guild_medal_listings_medal_idx on public.guild_medal_listings (medal_id, kind);

alter table public.guild_medal_listings enable row level security;

drop policy if exists "Leitura pública" on public.guild_medal_listings;
create policy "Leitura pública" on public.guild_medal_listings for select to anon, authenticated using (true);

-- Avisos de match. Só guarda "quem já foi avisado de quê" (e se já viu); o servidor do site apaga o que deixou de valer.
-- direction: 'give' = eu tenho a medalha e o outro quer; 'get' = o outro tem a medalha e eu quero.
create table if not exists public.guild_medal_notifications (
  member_id  bigint      not null references public.guild_members (id) on delete cascade,
  other_id   bigint      not null references public.guild_members (id) on delete cascade,
  medal_id   integer     not null check (medal_id > 0),
  direction  text        not null check (direction in ('give', 'get')),
  read       boolean     not null default false,
  created_at timestamptz not null default now(),
  primary key (member_id, other_id, medal_id, direction)
);

create index if not exists guild_medal_notifications_unread_idx on public.guild_medal_notifications (member_id) where read = false;

-- Sem política: só o servidor do site (service role) lê e escreve.
alter table public.guild_medal_notifications enable row level security;

-- Coloca, tira ou muda a quantidade de uma medalha na lista do membro. Quantidade 0 = remove.
-- GM001 = a mesma medalha já está na outra lista (tenho x quero) desse membro.
create or replace function public.set_guild_medal_listing(p_member_id bigint, p_medal_id integer, p_kind text, p_qty integer)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  if p_qty <= 0 then
    delete from public.guild_medal_listings where member_id = p_member_id and medal_id = p_medal_id and kind = p_kind;
    return;
  end if;

  if exists (
    select 1 from public.guild_medal_listings
    where member_id = p_member_id and medal_id = p_medal_id and kind <> p_kind
  ) then
    raise exception 'Medalha já está na outra lista' using errcode = 'GM001';
  end if;

  insert into public.guild_medal_listings (member_id, medal_id, kind, qty)
  values (p_member_id, p_medal_id, p_kind, least(p_qty, 99))
  on conflict (member_id, medal_id, kind) do update set qty = excluded.qty, updated_at = now();
end $$;

-- Troca feita: a medalha sai de quem entrega ("tenho") e de quem recebe ("quero"), na mesma quantidade (tudo ou nada).
-- Chega a 0 = o post some. GM002 = alguma das duas pontas não tem mais essa quantidade.
create or replace function public.complete_guild_medal_trade(p_giver bigint, p_receiver bigint, p_medal_id integer, p_qty integer)
returns void language plpgsql set search_path = '' as $$
declare
  v_have integer;
  v_want integer;
begin
  if p_giver = p_receiver or p_qty <= 0 then
    raise exception 'Troca inválida' using errcode = 'GM002';
  end if;

  select qty into v_have from public.guild_medal_listings
    where member_id = p_giver and medal_id = p_medal_id and kind = 'have' for update;
  select qty into v_want from public.guild_medal_listings
    where member_id = p_receiver and medal_id = p_medal_id and kind = 'want' for update;

  if v_have is null or v_want is null or v_have < p_qty or v_want < p_qty then
    raise exception 'Quantidade mudou' using errcode = 'GM002';
  end if;

  if v_have = p_qty then
    delete from public.guild_medal_listings where member_id = p_giver and medal_id = p_medal_id and kind = 'have';
  else
    update public.guild_medal_listings set qty = v_have - p_qty, updated_at = now()
      where member_id = p_giver and medal_id = p_medal_id and kind = 'have';
  end if;

  if v_want = p_qty then
    delete from public.guild_medal_listings where member_id = p_receiver and medal_id = p_medal_id and kind = 'want';
  else
    update public.guild_medal_listings set qty = v_want - p_qty, updated_at = now()
      where member_id = p_receiver and medal_id = p_medal_id and kind = 'want';
  end if;
end $$;

revoke execute on function public.set_guild_medal_listing(bigint, integer, text, integer) from public, anon, authenticated;
grant execute on function public.set_guild_medal_listing(bigint, integer, text, integer) to service_role;
revoke execute on function public.complete_guild_medal_trade(bigint, bigint, integer, integer) from public, anon, authenticated;
grant execute on function public.complete_guild_medal_trade(bigint, bigint, integer, integer) to service_role;

-- Tempo real: as listas aparecem para todo mundo na hora (a tabela já tem leitura pública).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'guild_medal_listings') then
    alter publication supabase_realtime add table public.guild_medal_listings;
  end if;
end $$;

notify pgrst, 'reload schema';
