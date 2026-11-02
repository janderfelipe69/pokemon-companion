-- Liga o "tempo real" nas tabelas da rodada do boss: o site passa a ser avisado na hora em que alguém publica,
-- retira o drop ou muda o que quer receber, e o plano de trocas se refaz sem esperar.
-- As duas tabelas já têm leitura pública (RLS), então o navegador só recebe o que já podia ler.
-- Rode DEPOIS do 0011. Seguro para executar mais de uma vez.

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['guild_boost_drops', 'guild_boost_wants'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
