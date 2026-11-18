-- When the customer confirms the delivery, tell the seller: the sale is closed and, unless a
-- return is open, it is ready to be paid out (simulated).

create or replace function private.trg_email_delivery_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.shipments%rowtype;
  o public.orders%rowtype;
begin
  begin
    if new.status <> 'completed' then
      return new;
    end if;
    select * into s from public.shipments where id = new.shipment_id;
    select * into o from public.orders where id = s.order_id;

    perform private.enqueue_email(
      private.email_of(s.vendor_id),
      private.locale_of(s.vendor_id),
      'delivery_confirmed',
      jsonb_build_object(
        'order_number', o.order_number,
        'items', (select coalesce(jsonb_agg(oi.product_name_snapshot order by oi.id), '[]'::jsonb)
                    from public.order_items oi where oi.shipment_id = s.id)
      )
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists shipment_events_email_vendor on public.shipment_events;
create trigger shipment_events_email_vendor
  after insert on public.shipment_events
  for each row execute function private.trg_email_delivery_confirmed();
