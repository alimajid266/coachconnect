-- Serialize booking requests on the slot row and reject an already requested slot
-- with a stable domain error instead of leaking a unique-index violation.
create or replace function public.request_coach_booking(target_slot_id uuid, requested_note text default null)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete_id uuid := (select auth.uid());
  target_coach_id uuid;
  target_slot public.coach_availability_slots;
  application public.coach_applications;
  created_booking public.coach_bookings;
begin
  if athlete_id is null then raise exception 'Authentication required'; end if;
  select coach_user_id into target_coach_id
  from public.coach_availability_slots
  where id = target_slot_id;
  if target_coach_id is null then raise exception 'That slot is no longer available'; end if;
  if target_coach_id = athlete_id then raise exception 'Coaches cannot book themselves'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(athlete_id, target_coach_id)::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(athlete_id, target_coach_id)::text, 0)
  );
  perform public.assert_active_member(athlete_id);
  perform public.assert_active_member(target_coach_id);

  select * into application
  from public.coach_applications
  where user_id = target_coach_id
  for share;
  if application.user_id is null or application.status <> 'APPROVED' then raise exception 'Coach is unavailable'; end if;

  select * into target_slot
  from public.coach_availability_slots
  where id = target_slot_id
  for update;
  if target_slot.id is null or target_slot.coach_user_id <> target_coach_id
    or target_slot.state <> 'OPEN' or target_slot.starts_at <= clock_timestamp() + interval '30 minutes'
  then raise exception 'That slot is no longer available'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    where booking.slot_id = target_slot.id
      and booking.status in ('REQUESTED', 'CONFIRMED')
  ) then raise exception 'That slot is no longer available'; end if;
  if char_length(trim(coalesce(requested_note, ''))) > 500 then raise exception 'Booking note is too long'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    join public.coach_availability_slots slot on slot.id = booking.slot_id
    where athlete_id in (booking.coach_user_id, booking.athlete_user_id)
      and booking.status in ('REQUESTED', 'CONFIRMED')
      and tstzrange(slot.starts_at, slot.ends_at, '[)') && tstzrange(target_slot.starts_at, target_slot.ends_at, '[)')
  ) then raise exception 'That time overlaps another booking in your schedule'; end if;
  if exists (
    select 1 from public.coach_availability_slots own_slot
    where own_slot.coach_user_id = athlete_id and own_slot.state = 'OPEN'
      and tstzrange(own_slot.starts_at, own_slot.ends_at, '[)') && tstzrange(target_slot.starts_at, target_slot.ends_at, '[)')
  ) then raise exception 'That time overlaps availability on your coach schedule'; end if;

  insert into public.coach_bookings (
    slot_id, coach_user_id, athlete_user_id, price_pkr, athlete_note
  ) values (
    target_slot.id, target_coach_id, athlete_id,
    application.session_price_pkr, nullif(trim(coalesce(requested_note, '')), '')
  ) returning * into created_booking;
  return created_booking;
end;
$$;
