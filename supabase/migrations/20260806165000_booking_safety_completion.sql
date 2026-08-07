alter table public.coach_bookings
  drop constraint coach_bookings_slot_id_fkey,
  drop constraint coach_bookings_coach_user_id_fkey,
  drop constraint coach_bookings_athlete_user_id_fkey;

alter table public.coach_bookings
  add constraint coach_bookings_slot_id_fkey
    foreign key (slot_id) references public.coach_availability_slots(id) on delete cascade,
  add constraint coach_bookings_coach_user_id_fkey
    foreign key (coach_user_id) references public.profiles(id) on delete cascade,
  add constraint coach_bookings_athlete_user_id_fkey
    foreign key (athlete_user_id) references public.profiles(id) on delete cascade,
  add column meeting_details text,
  add column refund_policy_outcome text not null default 'NOT_APPLICABLE'
    check (refund_policy_outcome in ('NOT_APPLICABLE', 'FULL_REFUND_DUE', 'OUTSIDE_FULL_REFUND_WINDOW')),
  add constraint coach_booking_meeting_details_length check (
    meeting_details is null or char_length(trim(meeting_details)) between 3 and 500
  );

alter table public.profiles
  add column account_status text not null default 'ACTIVE'
    check (account_status in ('ACTIVE', 'SUSPENDED')),
  add column account_suspension_reason text,
  add column account_suspended_at timestamptz,
  add column account_suspended_by uuid references public.profiles(id) on delete set null,
  add column account_suspension_previous_coach_status text
    check (account_suspension_previous_coach_status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  add constraint profile_account_suspension_state check (
    (account_status = 'ACTIVE' and account_suspension_reason is null and account_suspended_at is null)
    or (account_status = 'SUSPENDED'
      and char_length(trim(account_suspension_reason)) between 3 and 1000
      and account_suspended_at is not null)
  );

create or replace function public.assert_active_member(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = target_user_id and account_status = 'ACTIVE'
  ) then raise exception 'Active account required'; end if;
end;
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and account_status = 'ACTIVE'
  );
$$;

create or replace function public.is_coachconnect_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN' and account_status = 'ACTIVE'
  );
$$;

create or replace function public.reserve_coach_profile_image_upload(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved boolean;
begin
  perform public.assert_active_member(target_user_id);
  insert into public.coach_profile_image_upload_limits as upload_limit (
    user_id, upload_count, last_upload_at
  ) values (target_user_id, 1, clock_timestamp())
  on conflict (user_id) do update set
    upload_count = upload_limit.upload_count + 1,
    last_upload_at = clock_timestamp()
  where upload_limit.upload_count < 20
    and upload_limit.last_upload_at <= clock_timestamp() - interval '30 seconds'
  returning true into reserved;
  return coalesce(reserved, false);
end;
$$;

-- Full suspension is enforced at every existing direct-data boundary, not only
-- by the new booking functions. Public catalog reads remain intentionally open.
drop policy if exists "Users can read their own account profile" on public.profiles;
create policy "Users can read their own account profile" on public.profiles
for select to authenticated
using ((select auth.uid()) = id and (select public.is_active_member()));

drop policy if exists "Users can update their own allowed profile fields" on public.profiles;
create policy "Users can update their own allowed profile fields" on public.profiles
for update to authenticated
using ((select auth.uid()) = id and (select public.is_active_member()))
with check ((select auth.uid()) = id and (select public.is_active_member()));

drop policy if exists "Members can read their own coach application" on public.coach_applications;
create policy "Members can read their own coach application" on public.coach_applications
for select to authenticated
using (user_id = (select auth.uid()) and (select public.is_active_member()));

drop policy if exists "Members can create their own coach application" on public.coach_applications;
create policy "Members can create their own coach application" on public.coach_applications
for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'DRAFT' and (select public.is_active_member()));

drop policy if exists "Members can edit an open coach application" on public.coach_applications;
create policy "Members can edit an open coach application" on public.coach_applications
for update to authenticated
using (user_id = (select auth.uid()) and status in ('DRAFT', 'REJECTED', 'APPROVED') and (select public.is_active_member()))
with check (user_id = (select auth.uid()) and status in ('DRAFT', 'REJECTED', 'APPROVED') and (select public.is_active_member()));

drop policy if exists "Members view their own coach profile images" on storage.objects;
create policy "Members view their own coach profile images" on storage.objects
for select to authenticated
using (
  bucket_id = 'coach-profile-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select public.is_active_member())
);

create or replace function public.require_active_coach_application_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and new.user_id = (select auth.uid())
    and not public.is_active_member()
  then raise exception 'Active account required'; end if;
  return new;
end;
$$;
drop trigger if exists coach_applications_require_active_actor on public.coach_applications;
create trigger coach_applications_require_active_actor
before insert or update on public.coach_applications
for each row execute procedure public.require_active_coach_application_actor();

create or replace function public.set_member_account_suspension(
  target_user_id uuid,
  suspend_account boolean,
  requested_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_profile public.profiles;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if target_user_id = actor_id then raise exception 'Self-suspension is not allowed'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(actor_id, target_user_id)::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(actor_id, target_user_id)::text, 0)
  );
  perform public.assert_active_member(actor_id);
  if not public.is_coachconnect_admin() then raise exception 'Administrator access is required'; end if;
  if suspend_account and char_length(trim(coalesce(requested_reason, ''))) not between 3 and 1000
  then raise exception 'A suspension reason is required'; end if;

  select * into target_profile from public.profiles where id = target_user_id for update;
  if target_profile.id is null then raise exception 'Member account not found'; end if;

  if suspend_account and target_profile.account_status = 'ACTIVE' then
    update public.profiles
    set account_suspension_previous_coach_status = (
      select application.status from public.coach_applications application where application.user_id = target_user_id
    )
    where id = target_user_id;
    update public.coach_applications
    set status = 'SUSPENDED', reviewed_at = timezone('utc', now()), reviewed_by = actor_id,
        review_note = trim(requested_reason), updated_at = timezone('utc', now())
    where user_id = target_user_id and status = 'APPROVED';
  elsif not suspend_account and target_profile.account_status = 'SUSPENDED'
    and target_profile.account_suspension_previous_coach_status is not null
  then
    update public.coach_applications
    set status = target_profile.account_suspension_previous_coach_status,
        reviewed_at = timezone('utc', now()), reviewed_by = actor_id,
        review_note = 'Restored after full account suspension', updated_at = timezone('utc', now())
    where user_id = target_user_id;
  end if;

  update public.profiles
  set account_status = case when suspend_account then 'SUSPENDED' else 'ACTIVE' end,
      account_suspension_reason = case when suspend_account then trim(requested_reason) else null end,
      account_suspended_at = case when suspend_account then timezone('utc', now()) else null end,
      account_suspended_by = case when suspend_account then actor_id else null end,
      account_suspension_previous_coach_status = case when suspend_account then account_suspension_previous_coach_status else null end
  where id = target_user_id
  returning * into target_profile;
  return target_profile;
end;
$$;

create or replace function public.review_coach_application(
  target_user_id uuid,
  decision text,
  note text default null
)
returns public.coach_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_profile public.profiles;
  reviewed_application public.coach_applications;
  previous_status text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if target_user_id = actor_id then raise exception 'Self-review is not allowed'; end if;
  if decision not in ('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')
  then raise exception 'Unsupported review decision'; end if;
  if decision in ('REJECTED', 'SUSPENDED') and nullif(trim(note), '') is null
  then raise exception 'A review reason is required'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(actor_id, target_user_id)::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(actor_id, target_user_id)::text, 0)
  );
  perform public.assert_active_member(actor_id);
  if not public.is_coachconnect_admin() then raise exception 'Administrator access is required'; end if;
  select * into target_profile from public.profiles where id = target_user_id for update;
  if target_profile.id is null or target_profile.account_status <> 'ACTIVE'
  then raise exception 'Application cannot be reviewed while the account is suspended'; end if;

  select status into previous_status from public.coach_applications
  where user_id = target_user_id for update;
  update public.coach_applications
  set status = decision,
      review_note = case when decision = 'APPROVED' and previous_status = 'SUSPENDED' then review_note else nullif(trim(note), '') end,
      reviewed_at = timezone('utc', now()), reviewed_by = actor_id
  where user_id = target_user_id and (
    (decision = 'UNDER_REVIEW' and status = 'SUBMITTED')
    or (decision = 'APPROVED' and status in ('SUBMITTED', 'UNDER_REVIEW', 'SUSPENDED'))
    or (decision = 'REJECTED' and status in ('SUBMITTED', 'UNDER_REVIEW'))
    or (decision = 'SUSPENDED' and status = 'APPROVED')
  ) returning * into reviewed_application;
  if reviewed_application.user_id is null then raise exception 'Application cannot move to the requested status'; end if;

  insert into public.coach_moderation_events (
    coach_user_id, from_status, to_status, reason, actor_user_id, actor_name
  ) values (
    target_user_id, previous_status, decision,
    coalesce(nullif(trim(note), ''), case when decision = 'APPROVED' and previous_status = 'SUSPENDED' then 'Restored coach listing' end),
    actor_id,
    coalesce((select profile.display_name from public.profiles profile where profile.id = actor_id), 'CoachConnect administrator')
  );
  return reviewed_application;
end;
$$;

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
  if requested_start < clock_timestamp() + interval '30 minutes'
    or requested_start > clock_timestamp() + interval '180 days'
    or requested_end <= requested_start
    or requested_end - requested_start not between interval '30 minutes' and interval '3 hours'
  then raise exception 'Choose a valid future slot'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  perform public.assert_active_member(owner_id);
  select * into application
  from public.coach_applications
  where user_id = owner_id
  for share;
  if application.user_id is null or application.status <> 'APPROVED'
  then raise exception 'Approved coach access required'; end if;
  if requested_mode not in ('ONLINE', 'IN_PERSON')
    or (requested_mode = 'ONLINE' and not application.offers_online)
    or (requested_mode = 'IN_PERSON' and not application.offers_in_person)
  then raise exception 'That session format is unavailable'; end if;

  if exists (
    select 1 from public.coach_availability_slots slot
    where slot.coach_user_id = owner_id and slot.state = 'OPEN'
      and tstzrange(slot.starts_at, slot.ends_at, '[)') && tstzrange(requested_start, requested_end, '[)')
  ) then raise exception 'That time overlaps another available slot'; end if;
  if exists (
    select 1 from public.coach_bookings booking
    join public.coach_availability_slots booked_slot on booked_slot.id = booking.slot_id
    where owner_id in (booking.coach_user_id, booking.athlete_user_id)
      and booking.status in ('REQUESTED', 'CONFIRMED')
      and tstzrange(booked_slot.starts_at, booked_slot.ends_at, '[)') && tstzrange(requested_start, requested_end, '[)')
  ) then raise exception 'That time overlaps an active booking in your schedule'; end if;

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
declare
  owner_id uuid := (select auth.uid());
  preliminary_owner_id uuid;
  target_slot public.coach_availability_slots;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select coach_user_id into preliminary_owner_id
  from public.coach_availability_slots
  where id = target_slot_id;
  if preliminary_owner_id is null or preliminary_owner_id <> owner_id
  then raise exception 'Available slot not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  perform public.assert_active_member(owner_id);
  select * into target_slot
  from public.coach_availability_slots
  where id = target_slot_id
  for update;
  if target_slot.id is null or target_slot.coach_user_id <> owner_id or target_slot.state <> 'OPEN'
  then raise exception 'Available slot not found'; end if;

  if exists (
    select 1 from public.coach_bookings booking
    where booking.slot_id = target_slot_id and booking.status in ('REQUESTED', 'CONFIRMED')
  ) then raise exception 'Respond to or cancel the active booking first'; end if;

  update public.coach_availability_slots
  set state = 'CANCELLED', updated_at = timezone('utc', now())
  where id = target_slot_id
  returning * into target_slot;
  return target_slot;
end;
$$;

create or replace function public.respond_to_coach_booking(target_booking_id uuid, accept_booking boolean)
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
  application public.coach_applications;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into preliminary_booking
  from public.coach_bookings
  where id = target_booking_id;
  if preliminary_booking.id is null or preliminary_booking.coach_user_id <> actor_id
  then raise exception 'Pending booking request not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(least(preliminary_booking.coach_user_id, preliminary_booking.athlete_user_id)::text, 0)
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(greatest(preliminary_booking.coach_user_id, preliminary_booking.athlete_user_id)::text, 0)
  );
  perform public.assert_active_member(actor_id);
  if accept_booking then
    perform public.assert_active_member(preliminary_booking.athlete_user_id);
    select * into application
    from public.coach_applications
    where user_id = actor_id
    for share;
    if application.user_id is null or application.status <> 'APPROVED'
    then raise exception 'Pending booking request not found'; end if;
  end if;

  select * into target_slot
  from public.coach_availability_slots
  where id = preliminary_booking.slot_id
  for update;
  select * into target_booking
  from public.coach_bookings
  where id = target_booking_id
  for update;
  if target_booking.id is null or target_booking.coach_user_id <> actor_id
    or target_booking.slot_id <> target_slot.id or target_booking.status <> 'REQUESTED'
    or (accept_booking and (target_slot.state <> 'OPEN' or target_slot.starts_at <= clock_timestamp()))
  then raise exception 'Pending booking request not found'; end if;

  update public.coach_bookings
  set status = case when accept_booking then 'CONFIRMED' else 'DECLINED' end,
      responded_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into target_booking;
  return target_booking;
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

  update public.coach_bookings
  set status = case when coach_user_id = actor_id then 'CANCELLED_BY_COACH' else 'CANCELLED_BY_ATHLETE' end,
      refund_policy_outcome = case
        when coach_user_id = actor_id then 'FULL_REFUND_DUE'
        when clock_timestamp() <= target_slot.starts_at - interval '24 hours' then 'FULL_REFUND_DUE'
        else 'OUTSIDE_FULL_REFUND_WINDOW'
      end,
      cancellation_note = nullif(trim(coalesce(requested_reason, '')), ''),
      cancelled_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into target_booking;
  return target_booking;
end;
$$;

create or replace function public.complete_coach_booking(target_booking_id uuid)
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
  application public.coach_applications;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  select * into preliminary_booking from public.coach_bookings where id = target_booking_id;
  if preliminary_booking.id is null or preliminary_booking.coach_user_id <> actor_id
  then raise exception 'Completed session not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  select * into application from public.coach_applications where user_id = actor_id for share;
  if application.user_id is null or application.status <> 'APPROVED'
  then raise exception 'Completed session not found'; end if;
  select * into target_slot from public.coach_availability_slots
  where id = preliminary_booking.slot_id for update;
  select * into target_booking from public.coach_bookings
  where id = target_booking_id for update;
  if target_booking.id is null or target_booking.coach_user_id <> actor_id
    or target_booking.status <> 'CONFIRMED' or target_slot.ends_at > clock_timestamp()
  then raise exception 'Completed session not found'; end if;

  update public.coach_bookings
  set status = 'COMPLETED', completed_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into target_booking;
  return target_booking;
end;
$$;

create or replace function public.set_coach_booking_meeting_details(target_booking_id uuid, requested_details text)
returns public.coach_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  application public.coach_applications;
  changed public.coach_bookings;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(coalesce(requested_details, ''))) not between 3 and 500
  then raise exception 'Meeting details must be between 3 and 500 characters'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  select * into application from public.coach_applications where user_id = actor_id for share;
  if application.user_id is null or application.status <> 'APPROVED'
  then raise exception 'Confirmed booking not found'; end if;

  update public.coach_bookings booking
  set meeting_details = trim(requested_details), updated_at = timezone('utc', now())
  where booking.id = target_booking_id
    and booking.coach_user_id = actor_id
    and booking.status in ('CONFIRMED', 'COMPLETED')
  returning booking.* into changed;
  if changed.id is null then raise exception 'Confirmed booking not found'; end if;
  return changed;
end;
$$;

drop function public.list_my_coach_schedule();
create function public.list_my_coach_schedule()
returns table (
  booking_id uuid, slot_id uuid, coach_user_id uuid, athlete_user_id uuid,
  coach_name text, athlete_name text, starts_at timestamptz, ends_at timestamptz,
  session_mode text, status text, price_pkr integer, payment_status text,
  athlete_note text, cancellation_note text, meeting_details text, refund_policy_outcome text
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
    booking.refund_policy_outcome
  from public.coach_bookings booking
  join public.coach_availability_slots slot on slot.id = booking.slot_id
  join public.profiles coach_profile on coach_profile.id = booking.coach_user_id
  join public.profiles athlete_profile on athlete_profile.id = booking.athlete_user_id
  left join public.coach_applications application on application.user_id = booking.coach_user_id
  where actor_id in (booking.coach_user_id, booking.athlete_user_id)
  order by slot.starts_at;
end;
$$;

create or replace function public.list_my_coach_slots()
returns table (
  slot_id uuid, starts_at timestamptz, ends_at timestamptz,
  session_mode text, state text, booking_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  application public.coach_applications;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  select * into application from public.coach_applications where user_id = actor_id for share;
  if application.user_id is null or application.status <> 'APPROVED' then return; end if;
  return query
  select slot.id, slot.starts_at, slot.ends_at, slot.session_mode, slot.state, booking.status
  from public.coach_availability_slots slot
  left join public.coach_bookings booking on booking.slot_id = slot.id
    and booking.status in ('REQUESTED', 'CONFIRMED')
  where slot.coach_user_id = actor_id
  order by slot.starts_at;
end;
$$;

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Authentication is required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text, 0));
  if exists (
    select 1
    from public.coach_bookings booking
    join public.coach_availability_slots slot on slot.id = booking.slot_id
    where account_id in (booking.coach_user_id, booking.athlete_user_id)
      and booking.status in ('REQUESTED', 'CONFIRMED')
      and slot.ends_at > clock_timestamp()
  ) then
    raise exception 'Resolve future active sessions before deleting your account';
  end if;

  delete from auth.users where id = account_id;
  if not found then raise exception 'Account was not found'; end if;
  return true;
end;
$$;

revoke all on function public.assert_active_member(uuid) from public, anon, authenticated;
revoke all on function public.is_active_member() from public, anon;
revoke all on function public.require_active_coach_application_actor() from public, anon, authenticated;
revoke all on function public.set_member_account_suspension(uuid, boolean, text) from public, anon;
revoke all on function public.request_coach_booking(uuid, text) from public;
revoke all on function public.create_coach_availability_slot(timestamptz, timestamptz, text) from public;
revoke all on function public.cancel_coach_availability_slot(uuid) from public;
revoke all on function public.respond_to_coach_booking(uuid, boolean) from public;
revoke all on function public.cancel_coach_booking(uuid, text) from public;
revoke all on function public.complete_coach_booking(uuid) from public;
revoke all on function public.set_coach_booking_meeting_details(uuid, text) from public;
revoke all on function public.list_my_coach_schedule() from public;
revoke all on function public.list_my_coach_slots() from public;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.is_active_member() to authenticated;
grant execute on function public.set_member_account_suspension(uuid, boolean, text) to authenticated;
grant execute on function public.request_coach_booking(uuid, text) to authenticated;
grant execute on function public.create_coach_availability_slot(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.cancel_coach_availability_slot(uuid) to authenticated;
grant execute on function public.respond_to_coach_booking(uuid, boolean) to authenticated;
grant execute on function public.cancel_coach_booking(uuid, text) to authenticated;
grant execute on function public.complete_coach_booking(uuid) to authenticated;
grant execute on function public.set_coach_booking_meeting_details(uuid, text) to authenticated;
grant execute on function public.list_my_coach_schedule() to authenticated;
grant execute on function public.list_my_coach_slots() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
