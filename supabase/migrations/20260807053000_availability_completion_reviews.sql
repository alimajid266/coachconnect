-- Working-hour availability windows, manual completion, and verified reviews.

create or replace function public.create_coach_availability_window(
  requested_start timestamptz,
  requested_end timestamptz,
  requested_mode text,
  session_minutes integer default 60
)
returns setof public.coach_availability_slots
language plpgsql
security definer
set search_path = ''
as $$
declare
  cursor_start timestamptz;
  cursor_end timestamptz;
  created_slot public.coach_availability_slots;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if requested_start < clock_timestamp() + interval '30 minutes'
    or requested_start > clock_timestamp() + interval '180 days'
    or requested_end <= requested_start
    or requested_end - requested_start > interval '12 hours'
    or session_minutes not in (30, 60, 90, 120, 180)
  then raise exception 'Choose a valid availability window'; end if;

  cursor_start := requested_start;
  while cursor_start + make_interval(mins => session_minutes) <= requested_end loop
    cursor_end := cursor_start + make_interval(mins => session_minutes);
    created_slot := public.create_coach_availability_slot(cursor_start, cursor_end, requested_mode);
    return next created_slot;
    cursor_start := cursor_end;
  end loop;

  if cursor_start = requested_start then
    raise exception 'The availability window is shorter than the selected session length';
  end if;
  return;
end;
$$;

revoke all on function public.create_coach_availability_window(timestamptz, timestamptz, text, integer) from public;
grant execute on function public.create_coach_availability_window(timestamptz, timestamptz, text, integer) to authenticated;

-- Coaches explicitly confirm that a session happened. This is intentionally a
-- manual workflow: the application cannot observe an offline or third-party call.
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
  then raise exception 'Confirmed session not found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  select * into application from public.coach_applications where user_id = actor_id for share;
  if application.user_id is null or application.status <> 'APPROVED'
  then raise exception 'Confirmed session not found'; end if;
  select * into target_slot from public.coach_availability_slots
  where id = preliminary_booking.slot_id for update;
  select * into target_booking from public.coach_bookings
  where id = target_booking_id for update;
  if target_booking.id is null or target_booking.coach_user_id <> actor_id
    or target_booking.status <> 'CONFIRMED' or target_slot.id is null
  then raise exception 'Confirmed session not found'; end if;

  update public.coach_bookings
  set status = 'COMPLETED', completed_at = timezone('utc', now()), updated_at = timezone('utc', now())
  where id = target_booking_id
  returning * into target_booking;
  return target_booking;
end;
$$;

create table public.coach_reviews (
  booking_id uuid primary key references public.coach_bookings(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id) on delete restrict,
  athlete_user_id uuid not null references public.profiles(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  review_body text not null check (char_length(trim(review_body)) between 10 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  constraint coach_reviews_participants_differ check (coach_user_id <> athlete_user_id)
);

alter table public.coach_reviews enable row level security;
revoke all on table public.coach_reviews from anon, authenticated;

create or replace function public.submit_coach_review(
  target_booking_id uuid,
  requested_rating integer,
  requested_review text
)
returns public.coach_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_booking public.coach_bookings;
  created_review public.coach_reviews;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if requested_rating not between 1 and 5
    or char_length(trim(coalesce(requested_review, ''))) not between 10 and 1000
  then raise exception 'Choose a rating and write 10 to 1000 characters'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor_id::text, 0));
  perform public.assert_active_member(actor_id);
  select * into target_booking from public.coach_bookings
  where id = target_booking_id for update;
  if target_booking.id is null or target_booking.athlete_user_id <> actor_id
    or target_booking.status <> 'COMPLETED'
  then raise exception 'Completed session not found'; end if;

  insert into public.coach_reviews (booking_id, coach_user_id, athlete_user_id, rating, review_body)
  values (target_booking.id, target_booking.coach_user_id, actor_id, requested_rating, trim(requested_review))
  returning * into created_review;
  return created_review;
exception
  when unique_violation then raise exception 'This session has already been reviewed';
end;
$$;

create or replace function public.list_my_coach_reviews()
returns table (booking_id uuid, rating smallint, review_body text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare actor_id uuid := (select auth.uid());
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_active_member(actor_id);
  return query
  select review.booking_id, review.rating, review.review_body, review.created_at
  from public.coach_reviews review
  where actor_id in (review.coach_user_id, review.athlete_user_id)
  order by review.created_at desc;
end;
$$;

create or replace function public.list_public_coach_stats()
returns table (coach_user_id uuid, rating numeric, review_count bigint, lesson_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select app.user_id,
    round(avg(review.rating)::numeric, 1) as rating,
    count(distinct review.booking_id) as review_count,
    count(distinct booking.id) filter (where booking.status = 'COMPLETED') as lesson_count
  from public.coach_applications app
  join public.profiles profile on profile.id = app.user_id and profile.account_status = 'ACTIVE'
  left join public.coach_bookings booking on booking.coach_user_id = app.user_id
  left join public.coach_reviews review on review.coach_user_id = app.user_id
  where app.status = 'APPROVED'
  group by app.user_id;
$$;

create or replace function public.get_public_coach_stats(target_user_id uuid)
returns table (coach_user_id uuid, rating numeric, review_count bigint, lesson_count bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select stats.* from public.list_public_coach_stats() stats where stats.coach_user_id = target_user_id;
$$;

create or replace function public.list_public_coach_reviews(target_user_id uuid)
returns table (rating smallint, review_body text, created_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select review.rating, review.review_body, review.created_at
  from public.coach_reviews review
  join public.coach_applications app on app.user_id = review.coach_user_id and app.status = 'APPROVED'
  join public.profiles profile on profile.id = review.coach_user_id and profile.account_status = 'ACTIVE'
  where review.coach_user_id = target_user_id
  order by review.created_at desc
  limit 20;
$$;

revoke all on function public.submit_coach_review(uuid, integer, text) from public;
revoke all on function public.list_my_coach_reviews() from public;
revoke all on function public.list_public_coach_stats() from public;
revoke all on function public.get_public_coach_stats(uuid) from public;
revoke all on function public.list_public_coach_reviews(uuid) from public;
grant execute on function public.submit_coach_review(uuid, integer, text) to authenticated;
grant execute on function public.list_my_coach_reviews() to authenticated;
grant execute on function public.list_public_coach_stats() to anon, authenticated;
grant execute on function public.get_public_coach_stats(uuid) to anon, authenticated;
grant execute on function public.list_public_coach_reviews(uuid) to anon, authenticated;
