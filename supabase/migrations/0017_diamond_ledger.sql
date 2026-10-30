-- Controle de compra e venda de diamantes (só o admin acessa, pelo painel /admin).
-- Rode DEPOIS dos anteriores. Seguro para executar mais de uma vez.
--
-- Um "ciclo" é um período de balanço. "Reiniciar" fecha o ciclo atual (ele fica guardado para consulta)
-- e abre um novo zerado. Só existe um ciclo aberto por vez.

create table if not exists public.diamond_cycles (
  id         bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  ended_at   timestamptz
);

-- Garante um único ciclo aberto (ended_at vazio).
create unique index if not exists diamond_one_open_cycle on public.diamond_cycles ((true)) where ended_at is null;

create table if not exists public.diamond_trades (
  id         bigint generated always as identity primary key,
  cycle_id   bigint      not null references public.diamond_cycles (id) on delete cascade,
  -- buy = compra, sell = venda, carry = estoque que veio do ciclo anterior (não conta como gasto).
  kind       text        not null check (kind in ('buy', 'sell', 'carry')),
  quantity   integer     not null check (quantity > 0 and quantity <= 1000000),
  unit_price bigint      not null check (unit_price >= 0 and unit_price <= 1000000000000),
  traded_at  timestamptz not null default now(),
  note       text        check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists diamond_trades_cycle_idx on public.diamond_trades (cycle_id, traded_at);

-- Só o servidor do site (service role) lê e escreve; sem política, ninguém mais enxerga.
alter table public.diamond_cycles enable row level security;
alter table public.diamond_trades enable row level security;

-- Fecha o ciclo aberto e abre um novo (tudo ou nada). Se sobrou estoque, ele entra no ciclo novo como "carry".
-- Devolve o id do ciclo novo.
create or replace function public.reset_diamond_cycle(p_carry_qty integer, p_carry_price bigint)
returns bigint language plpgsql set search_path = '' as $$
declare
  v_id bigint;
begin
  update public.diamond_cycles set ended_at = now() where ended_at is null;
  insert into public.diamond_cycles default values returning id into v_id;
  if p_carry_qty is not null and p_carry_qty > 0 then
    insert into public.diamond_trades (cycle_id, kind, quantity, unit_price, note)
    values (v_id, 'carry', p_carry_qty, greatest(coalesce(p_carry_price, 0), 0), 'Estoque do ciclo anterior');
  end if;
  return v_id;
end $$;

revoke execute on function public.reset_diamond_cycle(integer, bigint) from public, anon, authenticated;
grant execute on function public.reset_diamond_cycle(integer, bigint) to service_role;

notify pgrst, 'reload schema';
