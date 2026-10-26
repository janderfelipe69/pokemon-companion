-- Guarda, por rodada do boss, o(s) id(s) da mensagem que o site posta no Discord.
-- Assim cada nova publicação EDITA a mesma mensagem em vez de criar outra.
-- Rode DEPOIS do 0011. Seguro para executar mais de uma vez.

create table if not exists public.guild_discord_rounds (
  round_key   text        primary key,
  message_ids text[]      not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Só o servidor do site (service role) lê e escreve: sem política, ninguém mais enxerga.
alter table public.guild_discord_rounds enable row level security;

notify pgrst, 'reload schema';
