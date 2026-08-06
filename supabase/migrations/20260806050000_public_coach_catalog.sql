create index if not exists coach_applications_public_catalog_idx
  on public.coach_applications (status, updated_at desc, user_id);

drop policy if exists "Administrators can manage coach applications" on public.coach_applications;
drop policy if exists "Administrators can review coach applications" on public.coach_applications;
create policy "Administrators can review coach applications"
on public.coach_applications
for select
to authenticated
using (
  public.is_coachconnect_admin()
  and status <> 'DRAFT'
);

drop policy if exists "Administrators can read applicant profiles" on public.profiles;
create policy "Administrators can read applicant profiles"
on public.profiles
for select
to authenticated
using (
  public.is_coachconnect_admin()
  and exists (
    select 1
    from public.coach_applications as application
    where application.user_id = profiles.id
      and application.status <> 'DRAFT'
  )
);

alter table public.coach_applications
  add column if not exists public_name text
  check (public_name is null or char_length(trim(public_name)) between 2 and 60);

update public.coach_applications as application
set public_name = profile.display_name
from public.profiles as profile
where profile.id = application.user_id
  and application.public_name is null;

create or replace function public.is_valid_coach_availability(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(value) <> 'array' then false else
    jsonb_array_length(value) <= 30
    and not exists (
      select 1
      from jsonb_array_elements(value) as item
      where jsonb_typeof(item) <> 'string'
        or char_length(trim(item #>> '{}')) not between 1 and 120
    )
  end;
$$;

create or replace function public.is_valid_coach_faqs(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(value) <> 'array' then false else
    jsonb_array_length(value) <= 12
    and not exists (
      select 1
      from jsonb_array_elements(value) as item
      where jsonb_typeof(item) <> 'object'
        or jsonb_typeof(item -> 'question') is distinct from 'string'
        or char_length(trim(item ->> 'question')) not between 1 and 200
        or jsonb_typeof(item -> 'answer') is distinct from 'string'
        or char_length(trim(item ->> 'answer')) not between 1 and 1000
    )
  end;
$$;

revoke all on function public.is_valid_coach_availability(jsonb) from public;
revoke all on function public.is_valid_coach_faqs(jsonb) from public;
grant execute on function public.is_valid_coach_availability(jsonb) to authenticated;
grant execute on function public.is_valid_coach_faqs(jsonb) to authenticated;

alter table public.coach_applications
  drop constraint if exists coach_applications_valid_availability,
  add constraint coach_applications_valid_availability
    check (public.is_valid_coach_availability(availability)),
  drop constraint if exists coach_applications_valid_faqs,
  add constraint coach_applications_valid_faqs
    check (public.is_valid_coach_faqs(faqs));

create or replace function public.set_initial_coach_public_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select profile.display_name into new.public_name
  from public.profiles as profile
  where profile.id = new.user_id;
  return new;
end;
$$;

revoke all on function public.set_initial_coach_public_name() from public;

drop trigger if exists coach_applications_set_initial_public_name on public.coach_applications;
create trigger coach_applications_set_initial_public_name
before insert on public.coach_applications
for each row execute procedure public.set_initial_coach_public_name();

create or replace function public.list_public_coaches()
returns table (
  user_id uuid,
  display_name text,
  headline text,
  bio text,
  sports text[],
  experience_years integer,
  qualifications text,
  audiences text[],
  levels text[],
  lesson_plan text,
  session_price_pkr integer,
  offers_online boolean,
  offers_in_person boolean,
  city text,
  public_area text,
  availability jsonb,
  faqs jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    application.user_id,
    application.public_name as display_name,
    application.headline,
    application.bio,
    application.sports,
    application.experience_years,
    application.qualifications,
    application.audiences,
    application.levels,
    application.lesson_plan,
    application.session_price_pkr,
    application.offers_online,
    application.offers_in_person,
    application.city,
    application.public_area,
    application.availability,
    application.faqs,
    application.updated_at
  from public.coach_applications as application
  where application.status = 'APPROVED'
    and application.public_name is not null
  order by application.updated_at desc, application.user_id;
$$;

comment on function public.list_public_coaches() is
  'Public, privacy-limited projection of approved coach profiles. Excludes account email, moderation notes, reviewers and precise coordinates.';

revoke all on function public.list_public_coaches() from public;
grant execute on function public.list_public_coaches() to anon, authenticated;

create or replace function public.require_review_after_approved_coach_edit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_public_name text;
begin
  if (select auth.uid()) = old.user_id then
    select profile.display_name into current_public_name
    from public.profiles as profile
    where profile.id = old.user_id;
  end if;

  if old.status = 'APPROVED'
    and new.status = 'APPROVED'
    and (select auth.uid()) = old.user_id
    and (
      current_public_name is distinct from old.public_name
      or row(
        new.headline, new.bio, new.sports, new.experience_years, new.qualifications,
        new.audiences, new.levels, new.lesson_plan, new.session_price_pkr,
        new.offers_online, new.offers_in_person, new.city, new.public_area,
        new.availability, new.faqs
      ) is distinct from row(
        old.headline, old.bio, old.sports, old.experience_years, old.qualifications,
        old.audiences, old.levels, old.lesson_plan, old.session_price_pkr,
        old.offers_online, old.offers_in_person, old.city, old.public_area,
        old.availability, old.faqs
      )
    )
  then
    new.public_name := current_public_name;
    new.status := 'SUBMITTED';
    new.submitted_at := timezone('utc', now());
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.review_note := null;
  end if;
  return new;
end;
$$;

drop trigger if exists coach_applications_require_review_after_edit on public.coach_applications;
create trigger coach_applications_require_review_after_edit
before update on public.coach_applications
for each row execute procedure public.require_review_after_approved_coach_edit();

drop policy if exists "Members can edit an open coach application" on public.coach_applications;
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
  and status in ('DRAFT', 'REJECTED', 'APPROVED', 'SUBMITTED')
);

create or replace function public.submit_coach_application()
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
    public_name = (
      select profile.display_name
      from public.profiles as profile
      where profile.id = (select auth.uid())
    ),
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

create table if not exists public.coach_moderation_events (
  id bigint generated by default as identity primary key,
  coach_user_id uuid not null,
  from_status text not null check (from_status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  to_status text not null check (to_status in ('UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  reason text,
  actor_user_id uuid not null,
  actor_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists coach_moderation_events_coach_created_idx
  on public.coach_moderation_events (coach_user_id, created_at desc, id desc);

alter table public.coach_moderation_events enable row level security;
revoke all on table public.coach_moderation_events from public, anon;
grant select on table public.coach_moderation_events to authenticated;

drop policy if exists "Administrators can read coach moderation events" on public.coach_moderation_events;
create policy "Administrators can read coach moderation events"
on public.coach_moderation_events
for select
to authenticated
using ((select public.is_coachconnect_admin()));

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
  reviewed_application public.coach_applications;
  previous_status text;
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

  if decision in ('REJECTED', 'SUSPENDED') and nullif(trim(note), '') is null then
    raise exception 'A review reason is required';
  end if;

  select status into previous_status
  from public.coach_applications
  where user_id = target_user_id;

  update public.coach_applications
  set
    status = decision,
    review_note = case
      when decision = 'APPROVED' and previous_status = 'SUSPENDED' then review_note
      else nullif(trim(note), '')
    end,
    reviewed_at = timezone('utc', now()),
    reviewed_by = (select auth.uid())
  where user_id = target_user_id
    and (
      (decision = 'UNDER_REVIEW' and status = 'SUBMITTED')
      or (decision = 'APPROVED' and status in ('SUBMITTED', 'UNDER_REVIEW', 'SUSPENDED'))
      or (decision = 'REJECTED' and status in ('SUBMITTED', 'UNDER_REVIEW'))
      or (decision = 'SUSPENDED' and status = 'APPROVED')
    )
  returning * into reviewed_application;

  if reviewed_application.user_id is null then
    raise exception 'Application cannot move to the requested status';
  end if;

  insert into public.coach_moderation_events (
    coach_user_id, from_status, to_status, reason, actor_user_id, actor_name
  ) values (
    target_user_id,
    previous_status,
    decision,
    coalesce(
      nullif(trim(note), ''),
      case when decision = 'APPROVED' and previous_status = 'SUSPENDED' then 'Restored coach listing' end
    ),
    (select auth.uid()),
    coalesce(
      (select profile.display_name from public.profiles as profile where profile.id = (select auth.uid())),
      'CoachConnect administrator'
    )
  );

  return reviewed_application;
end;
$$;

revoke all on function public.review_coach_application(uuid, text, text) from public;
grant execute on function public.review_coach_application(uuid, text, text) to authenticated;
