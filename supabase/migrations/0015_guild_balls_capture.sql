-- Captura dos projetos de balls: quando o Pokémon é capturado, o projeto é encerrado e guarda com qual ball foi.
-- Rode DEPOIS do 0014. Seguro para executar mais de uma vez.

alter table public.guild_ball_projects add column if not exists captured_at    timestamptz;
alter table public.guild_ball_projects add column if not exists captured_ball  text;
alter table public.guild_ball_projects add column if not exists captured_spent bigint check (captured_spent is null or captured_spent >= 0);
alter table public.guild_ball_projects add column if not exists captured_by    bigint references public.guild_members (id) on delete set null;

create index if not exists guild_ball_projects_captured_idx on public.guild_ball_projects (captured_at desc);

notify pgrst, 'reload schema';
