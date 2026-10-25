-- Boosts da guilda: além do TIPO, cada membro escolhe QUAIS NÍVEIS de stone quer daquele tipo
-- (Novice, Elemental, Common, Enhanced, Potent, Advanced). Ex.: Ghost → Potent + Advanced; Fire → só Advanced.
-- Rode DEPOIS do 0009. Seguro para executar mais de uma vez.

-- Quem já tinha escolhido um tipo continua recebendo todos os níveis dele, até editar.
alter table public.guild_boost_wants
  add column if not exists tiers text[] not null
  default array['novice', 'elemental', 'common', 'enhanced', 'potent', 'advanced'];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'guild_boost_wants_tiers_check') then
    alter table public.guild_boost_wants
      add constraint guild_boost_wants_tiers_check
      check (
        cardinality(tiers) >= 1
        and tiers <@ array['novice', 'elemental', 'common', 'enhanced', 'potent', 'advanced']::text[]
      );
  end if;
end $$;

-- Troca TUDO que um membro quer pela lista enviada (tudo ou nada).
-- p_wants: [{ "type": "ghost", "tiers": ["potent", "advanced"] }, ...]. Lista vazia = limpa.
create or replace function public.save_guild_tier_wants(p_member_id bigint, p_wants jsonb)
returns void language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  delete from public.guild_boost_wants
  where member_id = p_member_id
    and type not in (select w ->> 'type' from jsonb_array_elements(p_wants) as w);

  insert into public.guild_boost_wants (member_id, type, tiers)
  select p_member_id, w ->> 'type', array(select jsonb_array_elements_text(w -> 'tiers'))
  from jsonb_array_elements(p_wants) as w
  on conflict (member_id, type) do update set tiers = excluded.tiers;
end $$;

revoke execute on function public.save_guild_tier_wants(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.save_guild_tier_wants(bigint, jsonb) to service_role;

notify pgrst, 'reload schema';
