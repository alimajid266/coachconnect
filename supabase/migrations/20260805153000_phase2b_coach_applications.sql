create table public.coach_applications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  headline text,
  bio text,
  sports text[] not null default '{}',
  experience_years integer check (experience_years between 0 and 80),
  qualifications text,
  audiences text[] not null default '{}',
  levels text[] not null default '{}',
  lesson_plan text,
  session_price_pkr integer check (session_price_pkr between 500 and 1000000),
  offers_online boolean not null default false,
  offers_in_person boolean not null default false,
  city text,
  public_area text,
  longitude double precision check (longitude between -180 and 180),
  latitude double precision check (latitude between -90 and 90),
  availability jsonb not null default '[]'::jsonb
    check (jsonb_typeof(availability) = 'array'),
  faqs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(faqs) = 'array'),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  review_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (offers_in_person or public_area is null),
  check (
    (longitude is null and latitude is null)
    or (longitude is not null and latitude is not null)
  )
);

comment on table public.coach_applications is
  'Coach capability applications. Approval adds provider tools without removing member access.';

create index coach_applications_review_queue_idx
  on public.coach_applications (status, submitted_at);

create trigger coach_applications_set_updated_at
before update on public.coach_applications
for each row execute procedure public.set_profile_updated_at();

alter table public.coach_applications enable row level security;
revoke all on table public.coach_applications from anon, authenticated;
grant all on table public.coach_applications to service_role;
grant all on table public.profiles to service_role;
grant select on table public.coach_applications to authenticated;
grant insert (
  user_id, headline, bio, sports, experience_years, qualifications,
  audiences, levels, lesson_plan, session_price_pkr, offers_online,
  offers_in_person, city, public_area, longitude, latitude, availability, faqs
) on public.coach_applications to authenticated;
grant update (
  user_id, headline, bio, sports, experience_years, qualifications, audiences, levels,
  lesson_plan, session_price_pkr, offers_online, offers_in_person, city,
  public_area, longitude, latitude, availability, faqs
) on public.coach_applications to authenticated;

create function public.is_coachconnect_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid()) and role = 'ADMIN'
  );
$$;

revoke all on function public.is_coachconnect_admin() from public;
grant execute on function public.is_coachconnect_admin() to authenticated;

create or replace function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := left(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Member'),
    60
  );

  if char_length(requested_name) < 2 then
    requested_name := 'Member';
  end if;

  insert into public.profiles (id, display_name, role)
  values (new.id, requested_name, 'ATHLETE');

  return new;
end;
$$;

create policy "Administrators can read applicant profiles"
on public.profiles
for select
to authenticated
using ((select public.is_coachconnect_admin()));

create policy "Members can read their own coach application"
on public.coach_applications
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Members can create their own coach application"
on public.coach_applications
for insert
to authenticated
with check (user_id = (select auth.uid()) and status = 'DRAFT');

create policy "Members can edit an open coach application"
on public.coach_applications
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status in ('DRAFT', 'REJECTED', 'APPROVED')
)
with check (
  user_id = (select auth.uid())
  and status in ('DRAFT', 'REJECTED', 'APPROVED')
);

create policy "Administrators can review coach applications"
on public.coach_applications
for select
to authenticated
using ((select public.is_coachconnect_admin()));

create function public.submit_coach_application()
returns public.coach_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.coach_applications;
begin
  select * into application
  from public.coach_applications
  where user_id = (select auth.uid())
    and status in ('DRAFT', 'REJECTED');

  if application.user_id is null then
    raise exception 'No editable coach application was found';
  end if;

  if application.headline is null
    or char_length(trim(application.headline)) < 10
    or application.bio is null
    or char_length(trim(application.bio)) < 80
    or cardinality(application.sports) = 0
    or application.experience_years is null
    or application.qualifications is null
    or char_length(trim(application.qualifications)) < 10
    or cardinality(application.audiences) = 0
    or cardinality(application.levels) = 0
    or application.lesson_plan is null
    or char_length(trim(application.lesson_plan)) < 40
    or application.session_price_pkr is null
    or not (application.offers_online or application.offers_in_person)
    or (application.offers_in_person and (
      application.city is null or application.public_area is null
    ))
  then
    raise exception 'Complete every required coach profile field before submission';
  end if;

  update public.coach_applications
  set
    status = 'SUBMITTED',
    submitted_at = timezone('utc', now()),
    reviewed_at = null,
    reviewed_by = null,
    review_note = null
  where user_id = (select auth.uid())
  returning * into application;

  return application;
end;
$$;

revoke all on function public.submit_coach_application() from public;
grant execute on function public.submit_coach_application() to authenticated;

create function public.review_coach_application(
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
  reviewed_application public.coach_applications;
begin
  if not public.is_coachconnect_admin() then
    raise exception 'Administrator access is required';
  end if;

  if target_user_id = (select auth.uid()) then
    raise exception 'Self-review is not allowed';
  end if;

  if decision not in ('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED') then
    raise exception 'Unsupported review decision';
  end if;

  update public.coach_applications
  set
    status = decision,
    review_note = nullif(trim(note), ''),
    reviewed_at = timezone('utc', now()),
    reviewed_by = (select auth.uid())
  where user_id = target_user_id
    and (
      (decision = 'UNDER_REVIEW' and status = 'SUBMITTED')
      or (decision in ('APPROVED', 'REJECTED') and status in ('SUBMITTED', 'UNDER_REVIEW'))
      or (decision = 'SUSPENDED' and status = 'APPROVED')
    )
  returning * into reviewed_application;

  if reviewed_application.user_id is null then
    raise exception 'Application cannot move to the requested status';
  end if;

  return reviewed_application;
end;
$$;

revoke all on function public.review_coach_application(uuid, text, text) from public;
grant execute on function public.review_coach_application(uuid, text, text) to authenticated;
