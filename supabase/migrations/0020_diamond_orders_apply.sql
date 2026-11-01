-- Solicitações abertas passam a ser descontadas automaticamente quando você registra uma compra ou venda,
-- e continuam certas se o lançamento for editado ou apagado. Rode DEPOIS do 0019. Seguro para executar mais de uma vez.
--
-- Códigos de erro: DO004 = tipo inválido, DO005 = sem ciclo aberto, DO006 = passaria da quantidade da solicitação,
-- DO007 = não dá para trocar o tipo de um lançamento que veio de uma solicitação, DO008 = lançamento não existe.

-- Registra uma compra ou venda. Com p_apply, o que foi negociado é descontado das solicitações abertas do mesmo tipo:
-- primeiro a de mesmo valor, depois a mais antiga, passando para a seguinte se a quantidade for maior (cada parte vira uma linha ligada à sua solicitação).
-- O que sobrar fica como lançamento comum. Devolve quantos dd foram descontados de solicitações.
create or replace function public.add_diamond_trade(p_kind text, p_qty integer, p_price bigint, p_at timestamptz, p_note text, p_apply boolean)
returns integer language plpgsql set search_path = '' as $$
declare
  v_cycle   bigint;
  v_left    integer := p_qty;
  v_applied integer := 0;
  v_take    integer;
  o         record;
begin
  if p_kind not in ('buy', 'sell') then
    raise exception 'Tipo inválido' using errcode = 'DO004';
  end if;
  select id into v_cycle from public.diamond_cycles where ended_at is null;
  if v_cycle is null then
    raise exception 'Sem balanço aberto' using errcode = 'DO005';
  end if;

  if p_apply then
    for o in
      select id, quantity, filled
        from public.diamond_orders
       where cycle_id = v_cycle and kind = p_kind and status = 'open' and quantity > filled
       order by (unit_price = p_price) desc, created_at, id
       for update
    loop
      exit when v_left <= 0;
      v_take := least(v_left, o.quantity - o.filled);

      insert into public.diamond_trades (cycle_id, kind, quantity, unit_price, traded_at, note, order_id)
      values (v_cycle, p_kind, v_take, p_price, coalesce(p_at, now()), p_note, o.id);

      update public.diamond_orders
         set filled = filled + v_take,
             status = case when filled + v_take >= quantity then 'filled' else 'open' end,
             closed_at = case when filled + v_take >= quantity then now() else null end
       where id = o.id;

      v_left := v_left - v_take;
      v_applied := v_applied + v_take;
    end loop;
  end if;

  if v_left > 0 then
    insert into public.diamond_trades (cycle_id, kind, quantity, unit_price, traded_at, note)
    values (v_cycle, p_kind, v_left, p_price, coalesce(p_at, now()), p_note);
  end if;

  return v_applied;
end $$;

-- Apaga um lançamento. Se ele veio de uma solicitação, a quantidade volta para ela (e ela reabre se estava concluída).
create or replace function public.delete_diamond_trade(p_id bigint)
returns void language plpgsql set search_path = '' as $$
declare
  t public.diamond_trades%rowtype;
begin
  select * into t from public.diamond_trades where id = p_id for update;
  if not found then
    raise exception 'Lançamento não existe' using errcode = 'DO008';
  end if;

  if t.order_id is not null then
    update public.diamond_orders
       set filled = greatest(filled - t.quantity, 0),
           status = case when status = 'filled' then 'open' else status end,
           closed_at = case when status = 'filled' then null else closed_at end
     where id = t.order_id;
  end if;

  delete from public.diamond_trades where id = p_id;
end $$;

-- Edita um lançamento. Se ele veio de uma solicitação, ela é ajustada junto (a diferença de quantidade entra ou sai do que já foi executado).
create or replace function public.update_diamond_trade(p_id bigint, p_kind text, p_qty integer, p_price bigint, p_at timestamptz, p_note text)
returns void language plpgsql set search_path = '' as $$
declare
  t        public.diamond_trades%rowtype;
  o        public.diamond_orders%rowtype;
  v_filled integer;
begin
  select * into t from public.diamond_trades where id = p_id for update;
  if not found then
    raise exception 'Lançamento não existe' using errcode = 'DO008';
  end if;

  if t.order_id is not null then
    select * into o from public.diamond_orders where id = t.order_id for update;
    if found then
      if p_kind is not null and p_kind <> t.kind then
        raise exception 'Não dá para trocar o tipo' using errcode = 'DO007';
      end if;
      v_filled := greatest(o.filled - t.quantity + p_qty, 0);
      if v_filled > o.quantity then
        raise exception 'Passa da quantidade da solicitação' using errcode = 'DO006';
      end if;
      update public.diamond_orders
         set filled = v_filled,
             status = case when o.status = 'cancelled' then 'cancelled' when v_filled >= o.quantity then 'filled' else 'open' end,
             closed_at = case when o.status = 'cancelled' then o.closed_at when v_filled >= o.quantity then coalesce(o.closed_at, now()) else null end
       where id = o.id;
    end if;
  end if;

  update public.diamond_trades
     set kind = case when kind = 'carry' then kind else coalesce(p_kind, kind) end,
         quantity = p_qty, unit_price = p_price, traded_at = coalesce(p_at, traded_at), note = p_note
   where id = p_id;
end $$;

revoke execute on function public.add_diamond_trade(text, integer, bigint, timestamptz, text, boolean) from public, anon, authenticated;
revoke execute on function public.delete_diamond_trade(bigint) from public, anon, authenticated;
revoke execute on function public.update_diamond_trade(bigint, text, integer, bigint, timestamptz, text) from public, anon, authenticated;
grant execute on function public.add_diamond_trade(text, integer, bigint, timestamptz, text, boolean) to service_role;
grant execute on function public.delete_diamond_trade(bigint) to service_role;
grant execute on function public.update_diamond_trade(bigint, text, integer, bigint, timestamptz, text) to service_role;

notify pgrst, 'reload schema';
