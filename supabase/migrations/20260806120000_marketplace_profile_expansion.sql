alter table public.coach_applications
  add column if not exists tags text[] not null default '{}',
  add column if not exists profile_image_path text,
  add column if not exists public_longitude double precision,
  add column if not exists public_latitude double precision;

create or replace function public.is_valid_coach_terms(
  value text[],
  maximum_items integer,
  maximum_length integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    cardinality(value) between 0 and maximum_items
    and cardinality(value) = cardinality(array(select distinct lower(trim(item)) from unnest(value) as item))
    and not exists (
      select 1
      from unnest(value) as item
      where char_length(trim(item)) not between 2 and maximum_length
        or item <> trim(item)
    );
$$;

revoke all on function public.is_valid_coach_terms(text[], integer, integer) from public;
grant execute on function public.is_valid_coach_terms(text[], integer, integer) to authenticated;

alter table public.coach_applications
  drop constraint if exists coach_applications_valid_sports,
  add constraint coach_applications_valid_sports check (
    public.is_valid_coach_terms(sports, 8, 60)
    and (status = 'DRAFT' or cardinality(sports) between 1 and 8)
  ),
  drop constraint if exists coach_applications_valid_tags,
  add constraint coach_applications_valid_tags check (
    public.is_valid_coach_terms(tags, 12, 40)
    and cardinality(tags) between 0 and 12
  ),
  drop constraint if exists coach_applications_valid_profile_image_path,
  add constraint coach_applications_valid_profile_image_path check (
    profile_image_path is null
    or (
      char_length(profile_image_path) between 40 and 240
      and profile_image_path !~ '(^|/)\.\.?(/|$)'
      and profile_image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
      and split_part(profile_image_path, '/', 1) = user_id::text
    )
  ),
  drop constraint if exists coach_applications_valid_public_map_point,
  add constraint coach_applications_valid_public_map_point check (
    (public_longitude is null and public_latitude is null)
    or (
      offers_in_person
      and public_longitude between 60 and 78
      and public_latitude between 23 and 38
    )
  );

grant update (tags, profile_image_path, public_longitude, public_latitude)
  on public.coach_applications to authenticated;
grant insert (tags, profile_image_path, public_longitude, public_latitude)
  on public.coach_applications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'coach-profile-images',
  'coach-profile-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.coach_profile_image_upload_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  upload_count integer not null default 0 check (upload_count between 0 and 20),
  last_upload_at timestamptz not null default '-infinity'::timestamptz
);

alter table public.coach_profile_image_upload_limits enable row level security;
revoke all on table public.coach_profile_image_upload_limits from anon, authenticated;

create or replace function public.reserve_coach_profile_image_upload(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved boolean;
begin
  insert into public.coach_profile_image_upload_limits as upload_limit (
    user_id, upload_count, last_upload_at
  ) values (
    target_user_id, 1, clock_timestamp()
  )
  on conflict (user_id) do update set
    upload_count = upload_limit.upload_count + 1,
    last_upload_at = clock_timestamp()
  where upload_limit.upload_count < 20
    and upload_limit.last_upload_at <= clock_timestamp() - interval '30 seconds'
  returning true into reserved;

  return coalesce(reserved, false);
end;
$$;

revoke all on function public.reserve_coach_profile_image_upload(uuid) from public, anon, authenticated;
grant execute on function public.reserve_coach_profile_image_upload(uuid) to service_role;

-- Uploads are server-controlled after signature validation. Authenticated clients
-- receive read access only to their own private draft images.
drop policy if exists "Members upload their own coach profile images" on storage.objects;
drop policy if exists "Members replace their own coach profile images" on storage.objects;
drop policy if exists "Members delete their own coach profile images" on storage.objects;
drop policy if exists "Members view their own coach profile images" on storage.objects;
create policy "Members view their own coach profile images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'coach-profile-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.is_approved_coach_profile_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_applications application
    where application.status = 'APPROVED'
      and application.profile_image_path = object_name
  );
$$;
revoke all on function public.is_approved_coach_profile_image(text) from public;
grant execute on function public.is_approved_coach_profile_image(text) to anon, authenticated;

drop policy if exists "Visitors view approved coach profile images" on storage.objects;
create policy "Visitors view approved coach profile images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'coach-profile-images'
  and public.is_approved_coach_profile_image(name)
);

drop function if exists public.get_public_coach(uuid);
drop function if exists public.list_public_coaches();

create or replace function public.list_public_coaches()
returns table (
  user_id uuid,
  display_name text,
  headline text,
  bio text,
  sports text[],
  tags text[],
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
  public_longitude double precision,
  public_latitude double precision,
  profile_image_path text,
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
    application.public_name,
    application.headline,
    application.bio,
    application.sports,
    application.tags,
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
    application.public_longitude,
    application.public_latitude,
    application.profile_image_path,
    application.availability,
    coalesce((
      select jsonb_agg(jsonb_build_object('question', faq ->> 'question', 'answer', faq ->> 'answer'))
      from jsonb_array_elements(application.faqs) as faq
    ), '[]'::jsonb),
    application.updated_at
  from public.coach_applications as application
  where application.status = 'APPROVED'
    and application.public_name is not null
  order by application.updated_at desc, application.user_id;
$$;

create or replace function public.get_public_coach(target_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  headline text,
  bio text,
  sports text[],
  tags text[],
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
  public_longitude double precision,
  public_latitude double precision,
  profile_image_path text,
  availability jsonb,
  faqs jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select *
  from public.list_public_coaches() as coach
  where coach.user_id = target_user_id;
$$;

comment on function public.get_public_coach(uuid) is
  'Returns one approved privacy-limited public coach profile without revealing unavailable moderation state.';

revoke all on function public.list_public_coaches() from public;
revoke all on function public.get_public_coach(uuid) from public;
grant execute on function public.list_public_coaches() to anon, authenticated;
grant execute on function public.get_public_coach(uuid) to anon, authenticated;

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
        new.headline, new.bio, new.sports, new.tags, new.experience_years,
        new.qualifications, new.audiences, new.levels, new.lesson_plan,
        new.session_price_pkr, new.offers_online, new.offers_in_person,
        new.city, new.public_area, new.public_longitude, new.public_latitude,
        new.profile_image_path, new.availability, new.faqs
      ) is distinct from row(
        old.headline, old.bio, old.sports, old.tags, old.experience_years,
        old.qualifications, old.audiences, old.levels, old.lesson_plan,
        old.session_price_pkr, old.offers_online, old.offers_in_person,
        old.city, old.public_area, old.public_longitude, old.public_latitude,
        old.profile_image_path, old.availability, old.faqs
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
