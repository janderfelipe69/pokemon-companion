-- Drops de itens por Pokémon (zona, quantidade, chance).
-- Seguro para executar mais de uma vez: não apaga nem sobrescreve o que você já cadastrou.
-- Usa a tabela pokemon_talent_drops que já existe desde o 0001 (a coluna antiga "quantity" não é mais usada).

alter table public.pokemon_talent_drops
  add column if not exists zone text not null default 'base',
  add column if not exists quantity_min integer,
  add column if not exists quantity_max integer,
  add column if not exists chance numeric(6, 3),
  add column if not exists very_rare boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pokemon_talent_drops_zone_check') then
    alter table public.pokemon_talent_drops
      add constraint pokemon_talent_drops_zone_check check (zone in ('base', 'wildscape', 'primal'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pokemon_talent_drops_amounts_check') then
    alter table public.pokemon_talent_drops
      add constraint pokemon_talent_drops_amounts_check check (
        (quantity_min is null or quantity_min >= 1)
        and (quantity_max is null or quantity_max >= 1)
        and (quantity_min is null or quantity_max is null or quantity_max >= quantity_min)
        and (chance is null or (chance > 0 and chance <= 100))
        and not (very_rare and chance is not null)
      );
  end if;
end $$;

-- Antes: um item por Pokémon. Agora: um item por Pokémon em cada zona (Base, Wildscape, Primal).
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.pokemon_talent_drops'::regclass
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by att.attname)
        from pg_attribute att
        where att.attrelid = con.conrelid and att.attnum = any (con.conkey)
      ) = array['item_id', 'pokemon_id']::name[]
  loop
    execute format('alter table public.pokemon_talent_drops drop constraint %I', c.conname);
  end loop;
end $$;

create unique index if not exists pokemon_talent_drops_unique_idx
  on public.pokemon_talent_drops (pokemon_id, item_id, zone);
create index if not exists pokemon_talent_drops_item_idx on public.pokemon_talent_drops (item_id);

-- Salva todos os drops de um Pokémon de uma vez (tudo ou nada). Lista vazia = limpa os drops.
create or replace function public.save_pokemon_drops(p_pokemon_id text, p_drops jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  d jsonb;
begin
  if jsonb_typeof(p_drops) <> 'array' then
    raise exception 'p_drops deve ser uma lista';
  end if;

  delete from public.pokemon_talent_drops where pokemon_id = p_pokemon_id;

  for d in select * from jsonb_array_elements(p_drops) loop
    insert into public.pokemon_talent_drops (pokemon_id, item_id, zone, quantity_min, quantity_max, chance, very_rare)
    values (
      p_pokemon_id,
      (d->>'itemId')::bigint,
      d->>'zone',
      (d->>'min')::integer,
      (d->>'max')::integer,
      (d->>'chance')::numeric,
      coalesce((d->>'veryRare')::boolean, false)
    );
  end loop;
end $$;

revoke execute on function public.save_pokemon_drops(text, jsonb) from public, anon, authenticated;
grant execute on function public.save_pokemon_drops(text, jsonb) to service_role;

-- Faz a API do Supabase enxergar as mudanças na hora.
notify pgrst, 'reload schema';
