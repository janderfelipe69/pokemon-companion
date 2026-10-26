-- Times para a missão de clones da guilda (4 jogadores por time, 1 missão por mês por jogador).
-- Rode DEPOIS do 0009. Seguro para executar mais de uma vez.
-- O "mês" é sempre o de Brasília (America/Sao_Paulo): no dia 1 os times do mês anterior deixam de valer.

create table if not exists public.guild_clone_teams (
  id                 bigint generated always as identity primary key,
  difficulty         text        not null check (difficulty in ('easy', 'medium', 'hard')),
  leader_id          bigint      not null references public.guild_members (id) on delete cascade,
  note               text        check (note is null or char_length(note) <= 80),
  month_key          text        not null,
  discord_message_id text,
  created_at         timestamptz not null default now()
);

create table if not exists public.guild_clone_members (
  team_id   bigint      not null references public.guild_clone_teams (id) on delete cascade,
  member_id bigint      not null references public.guild_members (id) on delete cascade,
  month_key text        not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, member_id)
);

-- A regra do "1 vez por mês" mora no banco: um jogador só pode estar em um time por mês.
create unique index if not exists guild_clone_members_one_per_month on public.guild_clone_members (member_id, month_key);
create index if not exists guild_clone_teams_month_idx on public.guild_clone_teams (month_key);

-- Só o servidor do site (service role) lê e escreve; sem política, ninguém mais enxerga.
alter table public.guild_clone_teams enable row level security;
alter table public.guild_clone_members enable row level security;

create or replace function public.guild_clone_month() returns text
language sql stable set search_path = '' as $$
  select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM')
$$;

-- Cria o time e já coloca o líder nele (tudo ou nada). Devolve o id do time.
-- Erro 23505 = esse jogador já está em um time neste mês.
create or replace function public.create_guild_clone_team(p_member_id bigint, p_difficulty text, p_note text)
returns bigint language plpgsql set search_path = '' as $$
declare
  v_month text := public.guild_clone_month();
  v_id    bigint;
begin
  if not exists (select 1 from public.guild_members where id = p_member_id) then
    raise exception 'Membro não existe' using errcode = '23503';
  end if;

  insert into public.guild_clone_teams (difficulty, leader_id, note, month_key)
  values (p_difficulty, p_member_id, nullif(btrim(p_note), ''), v_month)
  returning id into v_id;

  insert into public.guild_clone_members (team_id, member_id, month_key) values (v_id, p_member_id, v_month);
  return v_id;
end $$;

-- Entra em um time com vaga. GC001 = time cheio, GC002 = time não existe (ou é de outro mês), 23505 = já está em um time.
create or replace function public.join_guild_clone_team(p_member_id bigint, p_team_id bigint)
returns void language plpgsql set search_path = '' as $$
declare
  v_month text := public.guild_clone_month();
begin
  perform 1 from public.guild_clone_teams where id = p_team_id and month_key = v_month for update;
  if not found then
    raise exception 'Time não existe' using errcode = 'GC002';
  end if;
  if (select count(*) from public.guild_clone_members where team_id = p_team_id) >= 4 then
    raise exception 'Time cheio' using errcode = 'GC001';
  end if;

  insert into public.guild_clone_members (team_id, member_id, month_key) values (p_team_id, p_member_id, v_month);
end $$;

-- Sai de um time. Se ele ficar vazio, é apagado; se o líder sair, o membro mais antigo vira líder.
-- Devolve true se o time foi apagado.
create or replace function public.leave_guild_clone_team(p_member_id bigint, p_team_id bigint)
returns boolean language plpgsql set search_path = '' as $$
declare
  v_next bigint;
begin
  perform 1 from public.guild_clone_teams where id = p_team_id for update;
  delete from public.guild_clone_members where team_id = p_team_id and member_id = p_member_id;

  select member_id into v_next from public.guild_clone_members where team_id = p_team_id order by joined_at, member_id limit 1;
  if v_next is null then
    delete from public.guild_clone_teams where id = p_team_id;
    return true;
  end if;

  update public.guild_clone_teams set leader_id = v_next where id = p_team_id and leader_id = p_member_id;
  return false;
end $$;

revoke execute on function public.create_guild_clone_team(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.join_guild_clone_team(bigint, bigint) from public, anon, authenticated;
revoke execute on function public.leave_guild_clone_team(bigint, bigint) from public, anon, authenticated;
grant execute on function public.create_guild_clone_team(bigint, text, text) to service_role;
grant execute on function public.join_guild_clone_team(bigint, bigint) to service_role;
grant execute on function public.leave_guild_clone_team(bigint, bigint) to service_role;

notify pgrst, 'reload schema';
