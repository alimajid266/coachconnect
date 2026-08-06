-- Remove any non-public FAQ properties that may have been stored before strict validation.
update public.coach_applications as application
set faqs = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'question', faq.item ->> 'question',
        'answer', faq.item ->> 'answer'
      )
      order by faq.ordinality
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(application.faqs) with ordinality as faq(item, ordinality)
)
where application.faqs <> '[]'::jsonb;

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
        or item is distinct from jsonb_build_object(
          'question', item -> 'question',
          'answer', item -> 'answer'
        )
        or jsonb_typeof(item -> 'question') is distinct from 'string'
        or char_length(trim(item ->> 'question')) not between 1 and 200
        or jsonb_typeof(item -> 'answer') is distinct from 'string'
        or char_length(trim(item ->> 'answer')) not between 1 and 1000
    )
  end;
$$;

revoke all on function public.is_valid_coach_faqs(jsonb) from public;
grant execute on function public.is_valid_coach_faqs(jsonb) to authenticated;

alter table public.coach_applications
  drop constraint if exists coach_applications_valid_faqs,
  add constraint coach_applications_valid_faqs
    check (public.is_valid_coach_faqs(faqs));

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
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'question', faq.item ->> 'question',
            'answer', faq.item ->> 'answer'
          )
          order by faq.ordinality
        )
        from jsonb_array_elements(application.faqs) with ordinality as faq(item, ordinality)
      ),
      '[]'::jsonb
    ) as faqs,
    application.updated_at
  from public.coach_applications as application
  where application.status = 'APPROVED'
    and application.public_name is not null
  order by application.updated_at desc, application.user_id;
$$;

comment on function public.list_public_coaches() is
  'Public, privacy-limited projection of approved coach profiles. Nested FAQ data is rebuilt from allowlisted question and answer fields.';

revoke all on function public.list_public_coaches() from public;
grant execute on function public.list_public_coaches() to anon, authenticated;

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
  where user_id = target_user_id
  for update;

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
