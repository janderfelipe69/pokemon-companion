-- Solicitações (ordens) de compra e venda de diamantes: você registra o pedido com o valor, e depois confirma
-- (tudo ou só uma parte). A confirmação cria o lançamento no balanço. Rode DEPOIS do 0017. Seguro para executar mais de uma vez.

create table if not exists public.diamond_orders (
  id            bigint generated always as identity primary key,
  cycle_id      bigint      not null references public.diamond_cycles (id) on delete cascade,
  kind          text        not null check (kind in ('buy', 'sell')),
  -- quantidade pedida no total, e quanto dela já foi executado (confirmado).
  quantity      integer     not null check (quantity > 0 and quantity <= 1000000),
  filled        integer     not null default 0 check (filled >= 0),
  -- valor atual da solicitação (pode ser alterado) e o valor com que ela nasceu.
  unit_price    bigint      not null check (unit_price >= 0 and unit_price <= 1000000000000),
  initial_price bigint      not null check (initial_price >= 0 and initial_price <= 1000000000000),
  status        text        not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  note          text        check (note is null or char_length(note) <= 120),
  created_at    timestamptz not null default now(),
  closed_at     timestamptz,
  constraint diamond_orders_filled_ok check (filled <= quantity)
);

create index if not exists diamond_orders_cycle_idx on public.diamond_orders (cycle_id, status);

-- Só o servidor do site (service role) lê e escreve; sem política, ninguém mais enxerga.
alter table public.diamond_orders enable row level security;

-- Cada lançamento que veio de uma solicitação guarda de qual (se a solicitação for apagada, o lançamento fica).
alter table public.diamond_trades add column if not exists order_id bigint references public.diamond_orders (id) on delete set null;

-- Confirma (tudo ou parte de) uma solicitação: cria o lançamento e atualiza o que já foi executado, tudo ou nada.
-- Devolve quanto ainda falta na solicitação. DO001 = não está aberta, DO002 = quantidade inválida, DO003 = preço inválido.
create or replace function public.fill_diamond_order(p_order_id bigint, p_qty integer, p_price bigint, p_at timestamptz)
returns integer language plpgsql set search_path = '' as $$
declare
  v    public.diamond_orders%rowtype;
  v_left integer;
begin
  select * into v from public.diamond_orders where id = p_order_id for update;
  if not found or v.status <> 'open' then
    raise exception 'Solicitação não está aberta' using errcode = 'DO001';
  end if;
  v_left := v.quantity - v.filled;
  if p_qty is null or p_qty < 1 or p_qty > v_left then
    raise exception 'Quantidade inválida' using errcode = 'DO002';
  end if;
  if p_price is null or p_price < 0 or p_price > 1000000000000 then
    raise exception 'Preço inválido' using errcode = 'DO003';
  end if;

  insert into public.diamond_trades (cycle_id, kind, quantity, unit_price, traded_at, note, order_id)
  values (v.cycle_id, v.kind, p_qty, p_price, coalesce(p_at, now()), v.note, v.id);

  update public.diamond_orders
     set filled = filled + p_qty,
         status = case when filled + p_qty >= quantity then 'filled' else 'open' end,
         closed_at = case when filled + p_qty >= quantity then now() else null end
   where id = v.id;

  return v_left - p_qty;
end $$;

revoke execute on function public.fill_diamond_order(bigint, integer, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.fill_diamond_order(bigint, integer, bigint, timestamptz) to service_role;

-- Reiniciar o balanço agora também leva as solicitações ABERTAS para o ciclo novo (elas continuam valendo no market).
-- As encerradas (concluídas e canceladas) ficam no ciclo antigo, como histórico.
create or replace function public.reset_diamond_cycle(p_carry_qty integer, p_carry_price bigint)
returns bigint language plpgsql set search_path = '' as $$
declare
  v_old bigint;
  v_id  bigint;
begin
  select id into v_old from public.diamond_cycles where ended_at is null;
  update public.diamond_cycles set ended_at = now() where ended_at is null;
  insert into public.diamond_cycles default values returning id into v_id;

  if v_old is not null then
    update public.diamond_orders set cycle_id = v_id where cycle_id = v_old and status = 'open';
  end if;

  if p_carry_qty is not null and p_carry_qty > 0 then
    insert into public.diamond_trades (cycle_id, kind, quantity, unit_price, note)
    values (v_id, 'carry', p_carry_qty, greatest(coalesce(p_carry_price, 0), 0), 'Estoque do ciclo anterior');
  end if;
  return v_id;
end $$;

notify pgrst, 'reload schema';
