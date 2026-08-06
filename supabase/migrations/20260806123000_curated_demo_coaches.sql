create table if not exists public.curated_demo_coaches (
  profile_slug text primary key,
  display_name text not null,
  headline text not null,
  bio text not null,
  sports text[] not null,
  tags text[] not null default '{}',
  experience_years integer not null check (experience_years between 0 and 80),
  session_price_pkr integer not null check (session_price_pkr between 500 and 100000),
  offers_online boolean not null default false,
  offers_in_person boolean not null default false,
  city text,
  public_area text,
  public_longitude double precision,
  public_latitude double precision,
  availability text[] not null default '{}',
  audiences text[] not null default '{}',
  levels text[] not null default '{}',
  qualifications text,
  lesson_plan text,
  languages text,
  coaching_style text,
  profile_image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curated_demo_format check (offers_online or offers_in_person),
  constraint curated_demo_sports check (cardinality(sports) between 1 and 8),
  constraint curated_demo_tags check (cardinality(tags) between 0 and 12),
  constraint curated_demo_map_pair check ((public_longitude is null) = (public_latitude is null)),
  constraint curated_demo_pakistan_map check (
    public_longitude is null or (
      public_longitude between 60 and 78 and public_latitude between 23 and 38
    )
  )
);

alter table public.curated_demo_coaches enable row level security;
revoke all on table public.curated_demo_coaches from anon, authenticated;

insert into public.curated_demo_coaches (
  profile_slug, display_name, headline, bio, sports, tags, experience_years,
  session_price_pkr, offers_online, offers_in_person, city, public_area,
  public_longitude, public_latitude, availability, audiences, levels,
  qualifications, lesson_plan, languages, coaching_style, is_active
) values
-- demo-coach-row
('ayesha-khan', 'Ayesha Khan', 'Beginner batting technique', 'A calm introduction to batting fundamentals for new players who want repeatable technique, confidence, and a clear practice routine.', array['Cricket'], array['Batting', 'Beginner friendly'], 8, 3500, false, true, 'Lahore', 'Gulberg', 74.3507, 31.5204, array['Saturday', 'Sunday'], array['Children', 'Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Goal check and warm-up|Focused batting drills|Guided practice and next steps', 'English|Urdu', 'Patient technical cues with progressive drills.', true),
-- demo-coach-row
('hamza-siddiqui', 'Hamza Siddiqui', 'Serve consistency and match confidence', 'Structured racket-sport coaching focused on reliable movement, cleaner contact, and practical decisions under match pressure.', array['Tennis', 'Badminton'], array['Serving', 'Match preparation'], 7, 4200, false, true, 'Karachi', 'Clifton', 67.0332, 24.8143, array['Friday', 'Saturday'], array['Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Movement check|Technique block|Point-based practice', 'English|Urdu', 'Direct feedback balanced with realistic games.', true),
-- demo-coach-row
('sara-ahmed', 'Sara Ahmed', 'Flexible online yoga foundations', 'Accessible online sessions for people building mobility, balance, and a sustainable movement habit from home.', array['Yoga'], array['Mobility', 'Remote coaching'], 6, 2500, true, false, null, null, null, null, array['Monday', 'Wednesday', 'Sunday'], array['Adults', 'Seniors'], array['Beginner', 'Intermediate'], null, 'Mobility check|Guided sequence|Home-practice plan', 'English|Urdu', 'Low-pressure coaching with clear modifications.', true),
-- demo-coach-row
('zainab-malik', 'Zainab Malik', 'Confident swimming fundamentals', 'Step-by-step in-person swimming coaching for learners developing safe breathing, body position, and efficient strokes.', array['Swimming'], array['Water confidence', 'Technique'], 9, 4000, false, true, 'Lahore', 'DHA', 74.4069, 31.4697, array['Tuesday', 'Thursday', 'Saturday'], array['Children', 'Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Safety check|Stroke skill|Supervised practice', 'English|Urdu', 'Safety-first progression at the learner''s pace.', true),
-- demo-coach-row
('omar-farooq', 'Omar Farooq', 'Online strength training for beginners', 'Remote strength sessions built around available equipment, sound movement patterns, and manageable weekly progress.', array['Strength'], array['Home workouts', 'Beginner friendly'], 5, 2800, true, false, null, null, null, null, array['Monday', 'Thursday', 'Saturday'], array['Adults'], array['Beginner', 'Intermediate'], null, 'Readiness check|Strength circuit|Weekly progression', 'English|Urdu', 'Practical sessions with simple measurable goals.', true),
-- demo-coach-row
('bilal-raza', 'Bilal Raza', 'Football skills and decision making', 'Small-group and individual football coaching focused on first touch, positioning, and confident choices in realistic play.', array['Football'], array['First touch', 'Youth coaching'], 10, 3800, false, true, 'Lahore', 'DHA Phase 5', 74.4454, 31.4632, array['Friday', 'Saturday', 'Sunday'], array['Children', 'Teenagers'], array['Beginner', 'Intermediate', 'Advanced'], null, 'Dynamic warm-up|Technical focus|Small-sided game', 'English|Urdu|Punjabi', 'Energetic, game-based instruction with short feedback loops.', true),
-- demo-coach-row
('danish-iqbal', 'Danish Iqbal', 'Boxing fitness and fundamentals', 'Technique-led boxing sessions for members seeking conditioning, coordination, and controlled foundational skill work.', array['Boxing'], array['Conditioning', 'Footwork'], 8, 3600, false, true, 'Karachi', 'Gulshan-e-Iqbal', 67.0971, 24.9207, array['Tuesday', 'Thursday', 'Sunday'], array['Adults'], array['Beginner', 'Intermediate'], null, 'Movement warm-up|Technique rounds|Conditioning finish', 'English|Urdu', 'Disciplined sessions with careful pacing and no medical claims.', true),
-- demo-coach-row
('hira-noor', 'Hira Noor', 'Badminton movement and control', 'Friendly badminton coaching that develops court movement, controlled strokes, and the confidence to sustain rallies.', array['Badminton'], array['Footwork', 'Rally control'], 6, 3000, false, true, 'Lahore', 'Model Town', 74.3242, 31.4805, array['Wednesday', 'Saturday'], array['Children', 'Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Movement pattern|Stroke focus|Rally challenge', 'English|Urdu', 'Encouraging repetition with visible session goals.', true),
-- demo-coach-row
('farhan-akram', 'Farhan Akram', 'Endurance running structure', 'Individual running coaching for athletes who want sensible pacing, consistent training habits, and clearer event preparation.', array['Running'], array['Endurance', 'Race preparation'], 11, 4500, true, true, 'Islamabad', 'F-8', 73.0377, 33.7105, array['Tuesday', 'Friday', 'Sunday'], array['Adults'], array['Beginner', 'Intermediate', 'Advanced'], null, 'Readiness review|Pacing session|Training-week plan', 'English|Urdu', 'Evidence-aware planning without medical or injury-treatment claims.', true),
-- demo-coach-row
('mariam-shah', 'Mariam Shah', 'Basketball handling and shooting', 'Focused basketball sessions that combine ball control, balanced shooting mechanics, and game-speed decision practice.', array['Basketball'], array['Ball handling', 'Shooting'], 7, 3400, false, true, 'Karachi', 'PECHS', 67.0611, 24.8718, array['Friday', 'Saturday'], array['Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Movement prep|Skill stations|Game-speed finish', 'English|Urdu', 'Fast-paced skill blocks with concise corrections.', true),
-- demo-coach-row
('usman-tariq', 'Usman Tariq', 'Table tennis consistency', 'Technical table-tennis coaching for players improving serve quality, rally stability, and purposeful match patterns.', array['Table Tennis'], array['Serving', 'Rally consistency'], 9, 3200, false, true, 'Lahore', 'Johar Town', 74.2728, 31.4694, array['Monday', 'Thursday', 'Saturday'], array['Teenagers', 'Adults'], array['Beginner', 'Intermediate', 'Advanced'], null, 'Serve review|Stroke block|Match pattern', 'English|Urdu', 'Detailed technical feedback followed by competitive practice.', true),
-- demo-coach-row
('nadia-hussain', 'Nadia Hussain', 'Gentle online mobility sessions', 'Short online sessions for adults and seniors who want an approachable movement routine adapted to comfort and experience.', array['Yoga', 'Strength'], array['Mobility', 'Older adults'], 6, 2200, true, false, null, null, null, null, array['Monday', 'Wednesday', 'Friday'], array['Adults', 'Seniors'], array['Beginner'], null, 'Comfort check|Guided mobility|Simple weekly routine', 'English|Urdu', 'Calm instructions and optional movement variations.', true),
-- demo-coach-row
('rida-aslam', 'Rida Aslam', 'Online cricket analysis and batting plans', 'Remote cricket sessions that use discussion and player-provided clips to clarify batting decisions and practice priorities.', array['Cricket'], array['Batting analysis', 'Remote coaching'], 7, 2700, true, false, null, null, null, null, array['Tuesday', 'Thursday', 'Sunday'], array['Teenagers', 'Adults'], array['Intermediate', 'Advanced'], null, 'Goal discussion|Clip review|Practice plan', 'English|Urdu', 'Question-led analysis with specific actionable practice tasks.', true),
-- demo-coach-row
('sameer-qureshi', 'Sameer Qureshi', 'Football conditioning and movement', 'Football-focused sessions that combine movement quality, ball work, and repeatable conditioning at an appropriate intensity.', array['Football', 'Strength'], array['Conditioning', 'Movement'], 8, 3900, false, true, 'Karachi', 'North Nazimabad', 67.0425, 24.9418, array['Wednesday', 'Friday', 'Sunday'], array['Teenagers', 'Adults'], array['Intermediate', 'Advanced'], null, 'Movement preparation|Ball-and-fitness block|Recovery plan', 'English|Urdu', 'Demanding but adjustable sessions with clear rest periods.', true),
-- demo-coach-row
('iqra-javed', 'Iqra Javed', 'Tennis fundamentals and rally confidence', 'Supportive tennis coaching for new and returning players developing movement, contact, and confidence in longer rallies.', array['Tennis'], array['Fundamentals', 'Beginner friendly'], 5, 3100, false, true, 'Islamabad', 'I-8', 73.1137, 33.6659, array['Friday', 'Saturday', 'Sunday'], array['Children', 'Teenagers', 'Adults'], array['Beginner', 'Intermediate'], null, 'Warm-up and goal|Technique practice|Guided rally', 'English|Urdu', 'Positive coaching with one clear technical focus at a time.', true)
on conflict (profile_slug) do update set
  display_name = excluded.display_name,
  headline = excluded.headline,
  bio = excluded.bio,
  sports = excluded.sports,
  tags = excluded.tags,
  experience_years = excluded.experience_years,
  session_price_pkr = excluded.session_price_pkr,
  offers_online = excluded.offers_online,
  offers_in_person = excluded.offers_in_person,
  city = excluded.city,
  public_area = excluded.public_area,
  public_longitude = excluded.public_longitude,
  public_latitude = excluded.public_latitude,
  availability = excluded.availability,
  audiences = excluded.audiences,
  levels = excluded.levels,
  qualifications = excluded.qualifications,
  lesson_plan = excluded.lesson_plan,
  languages = excluded.languages,
  coaching_style = excluded.coaching_style,
  is_active = excluded.is_active,
  updated_at = now();



create or replace function public.list_demo_coaches()
returns table (
  profile_id text,
  is_demo boolean,
  display_name text,
  headline text,
  bio text,
  sports text[],
  tags text[],
  experience_years integer,
  session_price_pkr integer,
  offers_online boolean,
  offers_in_person boolean,
  city text,
  public_area text,
  public_longitude double precision,
  public_latitude double precision,
  availability text[],
  audiences text[],
  levels text[],
  qualifications text,
  lesson_plan text,
  languages text,
  coaching_style text,
  profile_image_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    demo.profile_slug,
    true as is_demo,
    demo.display_name,
    demo.headline,
    demo.bio,
    demo.sports,
    demo.tags,
    demo.experience_years,
    demo.session_price_pkr,
    demo.offers_online,
    demo.offers_in_person,
    demo.city,
    demo.public_area,
    demo.public_longitude,
    demo.public_latitude,
    demo.availability,
    demo.audiences,
    demo.levels,
    demo.qualifications,
    demo.lesson_plan,
    demo.languages,
    demo.coaching_style,
    demo.profile_image_path
  from public.curated_demo_coaches demo
  where demo.is_active = true
  order by demo.display_name;
$$;

create or replace function public.get_public_demo_coach(target_profile_id text)
returns table (
  profile_id text,
  is_demo boolean,
  display_name text,
  headline text,
  bio text,
  sports text[],
  tags text[],
  experience_years integer,
  session_price_pkr integer,
  offers_online boolean,
  offers_in_person boolean,
  city text,
  public_area text,
  public_longitude double precision,
  public_latitude double precision,
  availability text[],
  audiences text[],
  levels text[],
  qualifications text,
  lesson_plan text,
  languages text,
  coaching_style text,
  profile_image_path text
)
language sql
security definer
set search_path = ''
stable
as $$
  select *
  from public.list_demo_coaches()
  where profile_id = target_profile_id
  limit 1;
$$;

revoke all on function public.list_demo_coaches() from public;
revoke all on function public.get_public_demo_coach(text) from public;
grant execute on function public.list_demo_coaches() to anon, authenticated;
grant execute on function public.get_public_demo_coach(text) to anon, authenticated;
