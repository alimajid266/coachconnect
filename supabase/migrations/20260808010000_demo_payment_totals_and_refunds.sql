-- Demo-only payment accounting and refund visibility. No real funds move through CoachConnect.

alter table public.coach_bookings
  add column if not exists payment_recorded_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table public.coach_bookings drop constraint if exists coach_bookings_payment_status_check;
alter table public.coach_bookings add constraint coach_bookings_payment_status_check
  check (payment_status in ('NOT_COLLECTED', 'DEMO_PAID', 'DEMO_REFUNDED'));

-- Legacy demo-payment timestamps cannot be reconstructed truthfully. Leave them null;
-- lifetime totals may include those records, while dated periods must exclude them.

update public.coach_bookings
set payment_status = 'DEMO_REFUNDED',
    refunded_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
where payment_status = 'DEMO_PAID'
  and status in ('CANCELLED_BY_ATHLETE', 'CANCELLED_BY_COACH')
  and refund_policy_outcome = 'FULL_REFUND_DUE';

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
    or changed.status not in ('CONFIRMED', 'COMPLETED') or changed.payment_status <> 'NOT_COLLECTED'
  then raise exception 'Confirmed or completed unpaid booking not found'; end if;

  update public.coach_bookings
  set payment_status = 'DEMO_PAID',
      payment_recorded_at = timezone('utc', now()),
      refunded_at = null,
      updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into changed;
  return changed;
end;
$$;

create or replace function public.cancel_coach_booking(target_booking_id uuid, requested_reason text default null)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  preliminary_booking public.coach_bookings;
  target_booking public.coach_bookings;
  target_slot public.coach_availability_slots;
  full_refund_due boolean;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(requested_reason, ''))) > 500 then raise exception 'Cancellation note is too long'; end if;
  select * into preliminary_booking from public.coach_bookings where id = target_booking_id;
  if preliminary_booking.id is null or actor_id not in (preliminary_booking.coach_user_id, preliminary_booking.athlete_user_id)
  then raise exception 'Active booking not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(preliminary_booking.coach_user_id, preliminary_booking.athlete_user_id)::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(preliminary_booking.coach_user_id, preliminary_booking.athlete_user_id)::text, 0)
  );
  perform public.assert_active_member(actor_id);
  select * into target_slot from public.coach_availability_slots
  where id = preliminary_booking.slot_id for update;
  select * into target_booking from public.coach_bookings
  where id = target_booking_id for update;
  if target_booking.id is null or actor_id not in (target_booking.coach_user_id, target_booking.athlete_user_id)
    or target_booking.status not in ('REQUESTED', 'CONFIRMED') or target_slot.ends_at <= clock_timestamp()
  then raise exception 'Active booking not found'; end if;

  full_refund_due := target_booking.coach_user_id = actor_id
    or clock_timestamp() <= target_slot.starts_at - interval '24 hours';

  update public.coach_bookings
  set status = case when coach_user_id = actor_id then 'CANCELLED_BY_COACH' else 'CANCELLED_BY_ATHLETE' end,
      refund_policy_outcome = case when full_refund_due then 'FULL_REFUND_DUE' else 'OUTSIDE_FULL_REFUND_WINDOW' end,
      payment_status = case
        when full_refund_due and target_booking.payment_status = 'DEMO_PAID' then 'DEMO_REFUNDED'
        else target_booking.payment_status
      end,
      refunded_at = case
        when full_refund_due and target_booking.payment_status = 'DEMO_PAID' then timezone('utc', now())
        else target_booking.refunded_at
      end,
      cancellation_note = nullif(trim(coalesce(requested_reason, '')), ''),
      cancelled_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into target_booking;
  return target_booking;
end;
$$;

drop function public.list_my_coach_schedule();
create function public.list_my_coach_schedule()
returns table (
  booking_id uuid, slot_id uuid, coach_user_id uuid, athlete_user_id uuid,
  coach_name text, athlete_name text, starts_at timestamptz, ends_at timestamptz,
  session_mode text, status text, price_pkr integer, payment_status text,
  athlete_note text, cancellation_note text, meeting_details text, refund_policy_outcome text,
  payment_recorded_at timestamptz, refunded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid());
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  update public.coach_bookings booking
  set status = 'EXPIRED',
      responded_at = coalesce(booking.responded_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  from public.coach_availability_slots slot
  where booking.slot_id = slot.id
    and actor_id in (booking.coach_user_id, booking.athlete_user_id)
    and booking.status = 'REQUESTED'
    and slot.starts_at <= clock_timestamp();
  return query
  select booking.id, slot.id, booking.coach_user_id, booking.athlete_user_id,
    coalesce(application.public_name, coach_profile.display_name), athlete_profile.display_name,
    slot.starts_at, slot.ends_at, slot.session_mode, booking.status,
    booking.price_pkr, booking.payment_status, booking.athlete_note, booking.cancellation_note,
    case when booking.status in ('CONFIRMED', 'COMPLETED') then booking.meeting_details else null end,
    booking.refund_policy_outcome, booking.payment_recorded_at, booking.refunded_at
  from public.coach_bookings booking
  join public.coach_availability_slots slot on slot.id = booking.slot_id
  join public.profiles coach_profile on coach_profile.id = booking.coach_user_id
  join public.profiles athlete_profile on athlete_profile.id = booking.athlete_user_id
  left join public.coach_applications application on application.user_id = booking.coach_user_id
  where actor_id in (booking.coach_user_id, booking.athlete_user_id)
  order by slot.starts_at;
end;
$$;

revoke all on function public.record_demo_booking_payment(uuid) from public;
grant execute on function public.record_demo_booking_payment(uuid) to authenticated;
revoke all on function public.cancel_coach_booking(uuid, text) from public;
grant execute on function public.cancel_coach_booking(uuid, text) to authenticated;
revoke all on function public.list_my_coach_schedule() from public;
grant execute on function public.list_my_coach_schedule() to authenticated;
