
-- Preços padrão por tier do Pokémon Companion.
-- Preserva os preços individuais já existentes.

create table if not exists public.tier_prices (
  tier_code text primary key references public.tiers(code) on update cascade,
  price_kk numeric(24, 4) check (price_kk is null or price_kk >= 0),
  price_brl numeric(18, 2) check (price_brl is null or price_brl >= 0),
  updated_at timestamptz not null default now()
);

alter table public.tier_prices enable row level security;

drop policy if exists "Leitura pública" on public.tier_prices;
create policy "Leitura pública"
  on public.tier_prices
  for select
  to anon, authenticated
  using (true);

-- Escritas administrativas serão feitas pela rota protegida do servidor.
drop policy if exists "Admin insere" on public.tier_prices;
drop policy if exists "Admin atualiza" on public.tier_prices;
drop policy if exists "Admin remove" on public.tier_prices;

create or replace function public.set_tier_prices_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tier_prices_set_updated_at on public.tier_prices;
create trigger tier_prices_set_updated_at
before update on public.tier_prices
for each row execute function public.set_tier_prices_updated_at();
