-- Expand the clearly labeled, identity-safe Demo catalog with fifteen additional profiles.
-- These records are illustrative and contain no fabricated reviews, bookings, or user identities.
insert into public.curated_demo_coaches (
  profile_slug, display_name, headline, bio, sports, tags, experience_years,
  session_price_pkr, offers_online, offers_in_person, city, public_area,
  public_longitude, public_latitude, availability, audiences, levels,
  qualifications, lesson_plan, languages, coaching_style, is_active
) values
-- demo-coach-row
('haris-mehmood', 'Haris Mehmood', 'Bowling control and match plans', 'Structured in-person cricket sessions focused on repeatable bowling mechanics, accuracy, and simple match plans.', array['Cricket'], array['Bowling','Match preparation'], 6, 3300, false, true, 'Islamabad', 'G-11', 73.0363, 33.6844, array['Tuesday','Saturday'], array['Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Movement and target warm-up|Bowling control block|Scenario practice and next steps', 'English|Urdu', 'Clear technical cues followed by target-based practice.', true),
-- demo-coach-row
('sana-rauf', 'Sana Rauf', 'Rally foundations and court movement', 'Supportive tennis coaching for new and returning players who want steadier rallies and more confident movement.', array['Tennis'], array['Rally consistency','Footwork'], 5, 3200, false, true, 'Lahore', 'Gulberg', 74.3587, 31.5204, array['Wednesday','Sunday'], array['Children','Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Movement check|Stroke foundations|Guided rally challenge', 'English|Urdu', 'Patient repetition with one movement goal at a time.', true),
-- demo-coach-row
('ahmed-nawaz', 'Ahmed Nawaz', 'Home strength and movement basics', 'Online strength coaching built around safe, repeatable movement and whatever equipment the athlete already has.', array['Strength'], array['Home workouts','Beginner friendly'], 4, 2400, true, false, null, null, null, null, array['Monday','Thursday'], array['Adults'], array['Beginner','Intermediate'], null, 'Readiness and space check|Technique-led strength circuit|Simple weekly progression', 'English|Urdu', 'Practical instruction with manageable progress targets.', true),
-- demo-coach-row
('mehwish-iqbal', 'Mehwish Iqbal', 'Breathing rhythm and stroke confidence', 'Calm, safety-first swimming coaching for learners developing breathing rhythm, body position, and stroke confidence.', array['Swimming'], array['Water confidence','Technique'], 8, 4100, false, true, 'Islamabad', 'F-10', 73.0315, 33.6992, array['Friday','Sunday'], array['Children','Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Pool safety and comfort check|Breathing and stroke drill|Supervised continuous practice', 'English|Urdu', 'Safety-first progression with calm, specific feedback.', true),
-- demo-coach-row
('talha-ansari', 'Talha Ansari', 'First touch and passing decisions', 'Game-based football coaching focused on first touch, passing options, and confident decisions in small-sided play.', array['Football'], array['First touch','Youth coaching'], 7, 3500, false, true, 'Rawalpindi', 'Bahria Town', 73.1114, 33.4959, array['Friday','Saturday'], array['Children','Teenagers'], array['Beginner','Intermediate','Advanced'], null, 'Ball warm-up|First-touch and passing block|Small-sided decision game', 'English|Urdu', 'Energetic sessions with short feedback between game rounds.', true),
-- demo-coach-row
('kiran-shah', 'Kiran Shah', 'Court coverage and rally control', 'Friendly badminton sessions for players improving court coverage, controlled contact, and rally confidence.', array['Badminton'], array['Footwork','Rally control'], 6, 3100, false, true, 'Karachi', 'DHA', 67.0556, 24.799, array['Tuesday','Saturday'], array['Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Footwork pattern|Stroke control block|Conditioned rally play', 'English|Urdu', 'Repeatable movement patterns followed by purposeful rallies.', true),
-- demo-coach-row
('saad-mirza', 'Saad Mirza', 'Ball handling and finishing', 'Focused basketball coaching combining ball control, balanced footwork, and composed finishing in realistic situations.', array['Basketball'], array['Ball handling','Shooting'], 7, 3600, false, true, 'Islamabad', 'E-11', 72.9886, 33.7018, array['Wednesday','Sunday'], array['Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Dynamic movement prep|Handling and finishing stations|Decision-based mini game', 'English|Urdu', 'Fast skill blocks with concise corrections and realistic decisions.', true),
-- demo-coach-row
('anum-tariq', 'Anum Tariq', 'Mobility and desk-work recovery', 'Accessible online yoga sessions for adults building mobility, balance, and a sustainable movement routine around desk work.', array['Yoga'], array['Mobility','Remote coaching'], 5, 2100, true, false, null, null, null, null, array['Monday','Wednesday','Friday'], array['Adults','Seniors'], array['Beginner'], null, 'Comfort and mobility check|Guided sequence|Short home-practice routine', 'English|Urdu', 'Calm instruction with clear movement options.', true),
-- demo-coach-row
('waleed-khan', 'Waleed Khan', 'Defense, balance and controlled combinations', 'Technique-first boxing coaching covering stance, balance, defense, and controlled combinations without competitive-fight claims.', array['Boxing'], array['Defense','Conditioning'], 9, 3700, false, true, 'Lahore', 'Model Town', 74.3239, 31.4834, array['Thursday','Sunday'], array['Adults'], array['Beginner','Intermediate'], null, 'Movement and guard warm-up|Defense and combination rounds|Controlled conditioning finish', 'English|Urdu', 'Disciplined technical rounds with careful pacing.', true),
-- demo-coach-row
('komal-aziz', 'Komal Aziz', '5K pacing and sustainable endurance', 'Practical running coaching for athletes building steadier pacing, sustainable volume, and confidence for a 5K goal.', array['Running'], array['Endurance','Race preparation'], 6, 2800, false, true, 'Lahore', 'Jilani Park', 74.334, 31.5466, array['Tuesday','Sunday'], array['Adults'], array['Beginner','Intermediate'], null, 'Readiness and form check|Pacing intervals|Recovery and weekly plan', 'English|Urdu', 'Measured progress with honest recovery checks and no medical claims.', true),
-- demo-coach-row
('rehan-malik', 'Rehan Malik', 'Serve variation and spin reading', 'Technical table-tennis coaching for players developing serve variation, spin reading, and purposeful point patterns.', array['Table Tennis'], array['Serving','Spin reading'], 8, 3000, false, true, 'Rawalpindi', 'Satellite Town', 73.0544, 33.6422, array['Monday','Saturday'], array['Teenagers','Adults'], array['Intermediate','Advanced'], null, 'Serve assessment|Spin and return block|Point-pattern practice', 'English|Urdu', 'Detailed technical feedback followed by competitive practice.', true),
-- demo-coach-row
('alina-qureshi', 'Alina Qureshi', 'Remote batting review and practice plans', 'Remote cricket analysis using athlete-provided clips to identify batting priorities and build focused practice tasks.', array['Cricket'], array['Batting analysis','Remote coaching'], 6, 2600, true, false, null, null, null, null, array['Tuesday','Thursday'], array['Teenagers','Adults'], array['Intermediate','Advanced'], null, 'Goal discussion|Clip and decision review|Personal practice plan', 'English|Urdu', 'Question-led review with specific, actionable practice priorities.', true),
-- demo-coach-row
('fahad-hussain', 'Fahad Hussain', 'Defending shape and transition play', 'Tactical football coaching for players improving defensive positioning, team shape, and decisions during transitions.', array['Football'], array['Positioning','Match preparation'], 10, 4000, false, true, 'Islamabad', 'F-8', 73.0398, 33.7102, array['Wednesday','Friday'], array['Teenagers','Adults'], array['Intermediate','Advanced'], null, 'Movement preparation|Positioning scenarios|Transition game and review', 'English|Urdu', 'Scenario-led coaching with clear tactical questions.', true),
-- demo-coach-row
('rabia-noor', 'Rabia Noor', 'Strength routines for busy beginners', 'Short online strength sessions for busy beginners who want clear movement instruction and a realistic weekly routine.', array['Strength'], array['Beginner friendly','Home workouts'], 5, 2300, true, false, null, null, null, null, array['Monday','Saturday'], array['Adults'], array['Beginner'], null, 'Readiness check|Full-body technique circuit|Weekly routine handoff', 'English|Urdu', 'Concise coaching with low-complexity progressions.', true),
-- demo-coach-row
('zeeshan-akram', 'Zeeshan Akram', 'Racket-sport footwork and consistency', 'Adaptable tennis and badminton coaching focused on efficient movement, clean contact, and longer controlled rallies.', array['Tennis','Badminton'], array['Footwork','Rally consistency'], 7, 3400, false, true, 'Rawalpindi', 'Saddar', 73.0526, 33.5969, array['Friday','Sunday'], array['Children','Teenagers','Adults'], array['Beginner','Intermediate'], null, 'Movement assessment|Contact and footwork block|Guided rally play', 'English|Urdu', 'Simple cues, repeatable patterns, and sport-specific rally practice.', true)
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
