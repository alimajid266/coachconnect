-- Non-financial payment placeholder. No card data is accepted or stored.

alter table public.coach_bookings drop constraint coach_bookings_payment_status_check;
alter table public.coach_bookings add constraint coach_bookings_payment_status_check
  check (payment_status in ('NOT_COLLECTED', 'DEMO_PAID'));

create or replace function public.record_demo_booking_payment(target_booking_id uuid)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  changed public.coach_bookings;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);

  select * into changed from public.coach_bookings
  where id = target_booking_id for update;
  if changed.id is null or changed.athlete_user_id <> actor_id
    or changed.status <> 'CONFIRMED' or changed.payment_status <> 'NOT_COLLECTED'
  then raise exception 'Confirmed unpaid booking not found'; end if;

  update public.coach_bookings
  set payment_status = 'DEMO_PAID', updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into changed;
  return changed;
end;
$$;

revoke all on function public.record_demo_booking_payment(uuid) from public;
grant execute on function public.record_demo_booking_payment(uuid) to authenticated;
