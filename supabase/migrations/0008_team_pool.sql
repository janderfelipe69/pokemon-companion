-- Lista de Pokémon úteis de cada tipo de time do Montador de times.
-- Hoje só o time "Fraco, eficiente e barato" (preset_id = 'economico') usa a lista.
-- Regra: preset com pelo menos 1 Pokémon na lista -> o montador sorteia só entre eles.
--        preset com a lista vazia                  -> o montador usa todos os Pokémon dos tiers dele (como antes).
-- Seguro para executar mais de uma vez: não apaga nem sobrescreve o que você já marcou.

create table if not exists public.team_pool (
  preset_id  text not null check (btrim(preset_id) <> ''),
  pokemon_id text not null references public.pokemon (id) on delete cascade on update cascade,
  primary key (preset_id, pokemon_id)
);
create index if not exists team_pool_pokemon_idx on public.team_pool (pokemon_id);

alter table public.team_pool enable row level security;

drop policy if exists "Leitura pública" on public.team_pool;
create policy "Leitura pública" on public.team_pool for select to anon, authenticated using (true);

-- Escritas administrativas são feitas pela rota protegida do servidor.

-- Troca a lista de um tipo de time pela lista enviada (tudo ou nada). Lista vazia = limpa.
create or replace function public.save_team_pool(p_preset text, p_pokemon_ids text[])
returns void language plpgsql set search_path = '' as $$
begin
  delete from public.team_pool where preset_id = p_preset and not (pokemon_id = any (p_pokemon_ids));

  insert into public.team_pool (preset_id, pokemon_id)
  select p_preset, id from unnest(p_pokemon_ids) as id
  on conflict do nothing;
end $$;

revoke execute on function public.save_team_pool(text, text[]) from public, anon, authenticated;
grant execute on function public.save_team_pool(text, text[]) to service_role;

-- Faz a API do Supabase enxergar a tabela nova na hora.
notify pgrst, 'reload schema';
