create table public.coach_availability_slots (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  session_mode text not null check (session_mode in ('ONLINE', 'IN_PERSON')),
  state text not null default 'OPEN' check (state in ('OPEN', 'CANCELLED')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_availability_slot_duration check (
    ends_at > starts_at
    and ends_at - starts_at between interval '30 minutes' and interval '3 hours'
  )
);

create index coach_availability_slots_coach_time_idx
  on public.coach_availability_slots (coach_user_id, starts_at);

create table public.coach_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.coach_availability_slots(id) on delete restrict,
  coach_user_id uuid not null references public.profiles(id) on delete restrict,
  athlete_user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'REQUESTED' check (status in (
    'REQUESTED', 'CONFIRMED', 'DECLINED',
    'CANCELLED_BY_ATHLETE', 'CANCELLED_BY_COACH', 'COMPLETED', 'EXPIRED'
  )),
  price_pkr integer not null check (price_pkr between 0 and 1000000),
  payment_status text not null default 'NOT_COLLECTED' check (payment_status = 'NOT_COLLECTED'),
  athlete_note text,
  cancellation_note text,
  requested_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_booking_distinct_people check (coach_user_id <> athlete_user_id),
  constraint coach_booking_note_lengths check (
    char_length(coalesce(athlete_note, '')) <= 500
    and char_length(coalesce(cancellation_note, '')) <= 500
  )
);

create unique index coach_bookings_one_active_request_per_slot
  on public.coach_bookings (slot_id)
  where status in ('REQUESTED', 'CONFIRMED');
create index coach_bookings_athlete_idx
  on public.coach_bookings (athlete_user_id, status);
create index coach_bookings_coach_idx
  on public.coach_bookings (coach_user_id, status);

alter table public.coach_availability_slots enable row level security;
alter table public.coach_bookings enable row level security;
revoke all on public.coach_availability_slots from anon, authenticated;
revoke all on public.coach_bookings from anon, authenticated;

create or replace function public.create_coach_availability_slot(
  requested_start timestamptz,
  requested_end timestamptz,
  requested_mode text
)
returns public.coach_availability_slots
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := (select auth.uid());
  application public.coach_applications;
  created_slot public.coach_availability_slots;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select * into application
  from public.coach_applications
  where user_id = owner_id and status = 'APPROVED';
  if application.user_id is null then raise exception 'Approved coach access required'; end if;
  if requested_start < clock_timestamp() + interval '30 minutes'
    or requested_start > clock_timestamp() + interval '180 days'
    or requested_end <= requested_start
    or requested_end - requested_start not between interval '30 minutes' and interval '3 hours'
  then raise exception 'Choose a valid future slot'; end if;
  if requested_mode not in ('ONLINE', 'IN_PERSON')
    or (requested_mode = 'ONLINE' and not application.offers_online)
    or (requested_mode = 'IN_PERSON' and not application.offers_in_person)
  then raise exception 'That session format is unavailable'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  if exists (
    select 1 from public.coach_availability_slots slot
    where slot.coach_user_id = owner_id and slot.state = 'OPEN'
      and tstzrange(slot.starts_at, slot.ends_at, '[)') && tstzrange(requested_start, requested_end, '[)')
  ) then raise exception 'That time overlaps another available slot'; end if;

  insert into public.coach_availability_slots (coach_user_id, starts_at, ends_at, session_mode)
  values (owner_id, requested_start, requested_end, requested_mode)
  returning * into created_slot;
  return created_slot;
end;
$$;

create or replace function public.cancel_coach_availability_slot(target_slot_id uuid)
returns public.coach_availability_slots
language plpgsql
security definer
set search_path = ''
as $$
declare changed public.coach_availability_slots;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    where booking.slot_id = target_slot_id and booking.status in ('REQUESTED', 'CONFIRMED')
  ) then raise exception 'Respond to or cancel the active booking first'; end if;
  update public.coach_availability_slots
  set state = 'CANCELLED', updated_at = timezone('utc', now())
  where id = target_slot_id and coach_user_id = (select auth.uid()) and state = 'OPEN'
  returning * into changed;
  if changed.id is null then raise exception 'Available slot not found'; end if;
  return changed;
end;
$$;

create or replace function public.list_public_coach_slots(target_coach_id uuid)
returns table (slot_id uuid, starts_at timestamptz, ends_at timestamptz, session_mode text)
language sql
stable
security definer
set search_path = ''
as $$
  select slot.id, slot.starts_at, slot.ends_at, slot.session_mode
  from public.coach_availability_slots slot
  where slot.coach_user_id = target_coach_id
    and slot.state = 'OPEN'
    and slot.starts_at > clock_timestamp()
    and exists (
      select 1 from public.coach_applications application
      where application.user_id = target_coach_id and application.status = 'APPROVED'
    )
    and not exists (
      select 1 from public.coach_bookings booking
      where booking.slot_id = slot.id and booking.status in ('REQUESTED', 'CONFIRMED')
    )
  order by slot.starts_at
  limit 60;
$$;

create or replace function public.request_coach_booking(target_slot_id uuid, requested_note text default null)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  athlete_id uuid := (select auth.uid());
  target_slot public.coach_availability_slots;
  application public.coach_applications;
  created_booking public.coach_bookings;
begin
  if athlete_id is null then raise exception 'Authentication required'; end if;
  select * into target_slot from public.coach_availability_slots where id = target_slot_id for update;
  if target_slot.id is null or target_slot.state <> 'OPEN' or target_slot.starts_at <= clock_timestamp() + interval '30 minutes'
  then raise exception 'That slot is no longer available'; end if;
  if target_slot.coach_user_id = athlete_id then raise exception 'Coaches cannot book themselves'; end if;
  select * into application from public.coach_applications
  where user_id = target_slot.coach_user_id and status = 'APPROVED';
  if application.user_id is null then raise exception 'Coach is unavailable'; end if;
  if char_length(trim(coalesce(requested_note, ''))) > 500 then raise exception 'Booking note is too long'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    join public.coach_availability_slots slot on slot.id = booking.slot_id
    where booking.athlete_user_id = athlete_id
      and booking.status in ('REQUESTED', 'CONFIRMED')
      and tstzrange(slot.starts_at, slot.ends_at, '[)') && tstzrange(target_slot.starts_at, target_slot.ends_at, '[)')
  ) then raise exception 'That time overlaps another booking in your schedule'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    where booking.slot_id = target_slot_id and booking.status in ('REQUESTED', 'CONFIRMED')
  ) then raise exception 'That slot is no longer available'; end if;

  insert into public.coach_bookings (
    slot_id, coach_user_id, athlete_user_id, price_pkr, athlete_note
  ) values (
    target_slot.id, target_slot.coach_user_id, athlete_id,
    application.session_price_pkr, nullif(trim(coalesce(requested_note, '')), '')
  ) returning * into created_booking;
  return created_booking;
end;
$$;

create or replace function public.respond_to_coach_booking(target_booking_id uuid, accept_booking boolean)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare changed public.coach_bookings;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.coach_bookings booking
  set status = case when accept_booking then 'CONFIRMED' else 'DECLINED' end,
      responded_at = timezone('utc', now()), updated_at = timezone('utc', now())
  from public.coach_availability_slots slot
  where booking.id = target_booking_id
    and booking.slot_id = slot.id
    and booking.coach_user_id = (select auth.uid())
    and booking.status = 'REQUESTED'
    and (not accept_booking or slot.starts_at > clock_timestamp())
  returning booking.* into changed;
  if changed.id is null then raise exception 'Pending booking request not found'; end if;
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
  changed public.coach_bookings;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(requested_reason, ''))) > 500 then raise exception 'Cancellation note is too long'; end if;
  update public.coach_bookings
  set status = case when coach_user_id = actor_id then 'CANCELLED_BY_COACH' else 'CANCELLED_BY_ATHLETE' end,
      cancellation_note = nullif(trim(coalesce(requested_reason, '')), ''),
      cancelled_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = target_booking_id
    and actor_id in (coach_user_id, athlete_user_id)
    and status in ('REQUESTED', 'CONFIRMED')
  returning * into changed;
  if changed.id is null then raise exception 'Active booking not found'; end if;
  return changed;
end;
$$;

create or replace function public.complete_coach_booking(target_booking_id uuid)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare changed public.coach_bookings;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  update public.coach_bookings booking
  set status = 'COMPLETED', completed_at = timezone('utc', now()), updated_at = timezone('utc', now())
  from public.coach_availability_slots slot
  where booking.id = target_booking_id and booking.slot_id = slot.id
    and booking.coach_user_id = (select auth.uid())
    and booking.status = 'CONFIRMED' and slot.ends_at <= clock_timestamp()
  returning booking.* into changed;
  if changed.id is null then raise exception 'Completed session not found'; end if;
  return changed;
end;
$$;

create or replace function public.list_my_coach_schedule()
returns table (
  booking_id uuid, slot_id uuid, coach_user_id uuid, athlete_user_id uuid,
  coach_name text, athlete_name text, starts_at timestamptz, ends_at timestamptz,
  session_mode text, status text, price_pkr integer, payment_status text,
  athlete_note text, cancellation_note text
)
language sql
stable
security definer
set search_path = ''
as $$
  select booking.id, slot.id, booking.coach_user_id, booking.athlete_user_id,
    coalesce(application.public_name, coach_profile.display_name), athlete_profile.display_name,
    slot.starts_at, slot.ends_at, slot.session_mode, booking.status,
    booking.price_pkr, booking.payment_status, booking.athlete_note, booking.cancellation_note
  from public.coach_bookings booking
  join public.coach_availability_slots slot on slot.id = booking.slot_id
  join public.profiles coach_profile on coach_profile.id = booking.coach_user_id
  join public.profiles athlete_profile on athlete_profile.id = booking.athlete_user_id
  left join public.coach_applications application on application.user_id = booking.coach_user_id
  where (select auth.uid()) in (booking.coach_user_id, booking.athlete_user_id)
  order by slot.starts_at;
$$;

create or replace function public.list_my_coach_slots()
returns table (
  slot_id uuid, starts_at timestamptz, ends_at timestamptz,
  session_mode text, state text, booking_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select slot.id, slot.starts_at, slot.ends_at, slot.session_mode, slot.state,
    booking.status
  from public.coach_availability_slots slot
  left join public.coach_bookings booking on booking.slot_id = slot.id
    and booking.status in ('REQUESTED', 'CONFIRMED')
  where slot.coach_user_id = (select auth.uid())
  order by slot.starts_at;
$$;

revoke all on function public.create_coach_availability_slot(timestamptz, timestamptz, text) from public;
revoke all on function public.cancel_coach_availability_slot(uuid) from public;
revoke all on function public.list_public_coach_slots(uuid) from public;
revoke all on function public.request_coach_booking(uuid, text) from public;
revoke all on function public.respond_to_coach_booking(uuid, boolean) from public;
revoke all on function public.cancel_coach_booking(uuid, text) from public;
revoke all on function public.complete_coach_booking(uuid) from public;
revoke all on function public.list_my_coach_schedule() from public;
revoke all on function public.list_my_coach_slots() from public;

grant execute on function public.list_public_coach_slots(uuid) to anon, authenticated;
-- Private booking capabilities remain unavailable until the safety-completion
-- migration replaces every implementation and grants the reviewed surface.
