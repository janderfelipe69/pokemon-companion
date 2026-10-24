-- Faixa de preço por tier (mínimo e máximo), em KK e em R$.
-- price_kk e price_brl continuam sendo o MÍNIMO (os valores já cadastrados são preservados).
-- price_kk_max / price_brl_max são opcionais: vazio = valor fixo, sem faixa.
-- Seguro para executar mais de uma vez.

alter table public.tier_prices
  add column if not exists price_kk_max numeric(24, 4),
  add column if not exists price_brl_max numeric(18, 2);

alter table public.tier_prices drop constraint if exists tier_prices_kk_range_check;
alter table public.tier_prices add constraint tier_prices_kk_range_check
  check (price_kk_max is null or (price_kk is not null and price_kk_max >= price_kk));

alter table public.tier_prices drop constraint if exists tier_prices_brl_range_check;
alter table public.tier_prices add constraint tier_prices_brl_range_check
  check (price_brl_max is null or (price_brl is not null and price_brl_max >= price_brl));
