# CoachConnect — Focused Zero-Cost MVP Plan

**Status:** Planning complete; implementation has not started.

**Launch market:** Pakistan  
**Currency:** Pakistani rupees (PKR), displayed as `Rs 3,000`  
**Target:** A polished, responsive portfolio MVP that can be run and tested locally for Rs 0  
**Estimated effort:** 7 focused working days, with 1–2 extra days kept as contingency  
**Development tools available:** Hermes Agent and Codex  

---

## 1. Final Product Scope

CoachConnect is a marketplace where athletes in Pakistan can:

1. Create an account.
2. Browse and search sports coaches.
3. receive personalized coach recommendations.
4. Read detailed coach profiles.
5. View services, prices, and availability.
6. Reserve a coaching session.
7. Cancel according to a clear policy.
8. Review a coach after a completed booking.

Coaches can:

1. Create and edit a profile.
2. List coaching services.
3. Explain what each service includes and excludes.
4. Set weekly availability and time off.
5. View and manage bookings.
6. Cancel a booking when necessary.

An administrator can:

1. Approve or reject coach profiles.
2. Suspend coaches.
3. View bookings.
4. Mark demo sessions complete.
5. Hide inappropriate reviews.

### Three demonstration sports

To keep the project focused and polished:

- Cricket
- Tennis
- Strength and conditioning

### Three initial cities

- Karachi
- Lahore
- Islamabad/Rawalpindi

The database can support more sports and cities later, but we will polish these first.

---

## 2. Features Included in the MVP

### Core features

- Athlete, coach, and administrator authentication
- Coach approval process
- Coach browsing
- Ordinary search and filters
- Coach recommendation system
- Natural-language search
- Coach profiles
- Service listings in PKR
- Availability management
- Conflict-safe booking
- Athlete and coach dashboards
- Client and coach cancellations
- Ratings and verified reviews
- Responsive, accessible interface
- Dockerized local application
- Automated tests
- README and five-minute demo script

### AI features included now

1. **Personalized coach recommendations**
2. **Natural-language coach search**

### Optional feature only if time remains

- AI-generated training plans

The training-plan feature must not delay or reduce the quality of the core marketplace.

### Explicitly excluded from the MVP

- Real online payments
- Subscriptions
- Platform commissions and payouts
- Native Android or iPhone apps
- Built-in video calls
- Real-time chat
- Email delivery service
- SMS or WhatsApp integration
- Maps requiring a paid provider
- Exact public coach addresses
- Multiple countries or currencies
- Group sessions
- Recurring booking packages
- Medical, injury-treatment, or rehabilitation advice
- AI-generated coach biographies
- Complicated cloud infrastructure

---

## 3. Zero-Cost Decision

The application must be fully usable and testable locally without subscriptions, paid APIs, or bank-card details.

### No payment mechanism in the MVP

The original requirements do not list payments as a required core feature. Real marketplace payments introduce:

- Payment-provider account requirements
- Pakistan availability and banking questions
- Identity verification
- Refund and dispute handling
- Risk of accidental real charges
- More testing time

Therefore, the MVP will **not collect money**.

The booking page will clearly say:

> CoachConnect does not process payments in this MVP. Any payment arrangement is agreed directly with the coach.

The platform will still display each service's price in PKR and record the booking.

### Cancellation policy represented in the application

- **Client cancels at least 24 hours before:** full-refund eligibility
- **Client cancels less than 24 hours before:** not automatically eligible for a full refund
- **Coach cancels at any time:** full-refund eligibility

Because CoachConnect does not hold money, it cannot actually issue the refund. The booking record will display the correct policy outcome, such as:

- `Cancelled — full refund due`
- `Cancelled — outside full-refund window`

The README and interface must state that the coach handles any direct refund. This is honest and testable.

### Local zero-cost services

- **Database:** SQLite file stored locally
- **Images:** local project assets
- **Authentication:** local database sessions
- **AI/recommendations:** local algorithms and a small local semantic model; no paid AI API
- **Notifications:** in-app status messages rather than email or SMS
- **Analytics/error services:** excluded; local logs only
- **Hosting:** local Docker application for the required deliverable

Optional cloud deployment can be considered later, but it is not required for the Rs 0 build and free-service terms must be checked at that time.

---

## 4. Simplified Architecture

```text
Athlete / Coach / Administrator
              |
              v
     CoachConnect website
     - pages and forms
     - login and permissions
     - search and recommendations
     - booking rules
              |
              v
       Local SQLite database
     - users
     - coach profiles
     - services
     - availability
     - bookings
     - reviews
```

Everything runs as one organized application. This is easier to build, test, explain, and restore than a collection of separate services.

### Recommended technical stack

- Next.js with TypeScript
- Tailwind CSS
- shadcn/ui components
- SQLite
- Prisma
- Auth.js or an equally small secure session system
- Vitest for rule tests
- Playwright for real browser tests
- Docker
- Git for local phase checkpoints
- GitHub Actions after repository publishing is approved

---

## 5. Home Screen Design

The home page should feel attractive, calm, and easy to understand. It must not attempt to show every feature at once.

### Section 1: Simple top navigation

Left:

- CoachConnect logo

Right:

- Find a Coach
- Become a Coach
- Sign In
- High-contrast `Get Started` button

On mobile, these options move into one clear menu.

### Section 2: Main introduction

Suggested heading:

> Find the right coach. Reach your next goal.

Suggested supporting text:

> Discover trusted sports coaches across Pakistan for one-to-one online and in-person sessions.

Primary search field:

> “What do you want help with?”

Examples beneath it:

- Improve my cricket batting in Lahore
- Beginner tennis coach under Rs 4,000
- Online strength coach for fat loss

Primary button: `Find coaches`

A strong licensed sports photograph appears beside or behind the introduction without making the text difficult to read.

### Section 3: Sports categories

Three clean category cards:

- Cricket
- Tennis
- Strength & Conditioning

Do not add a crowded horizontal list of many sports.

### Section 4: Recommended coaches

Show three or four coach cards containing only:

- Photograph
- Name
- Sport and specialty
- City or `Online`
- Rating and review count
- Starting price in PKR
- Next available date
- One short recommendation reason

Example reason:

> Strong match for beginner cricket players in Lahore.

For signed-out visitors, recommendations use popular and highly rated coaches. For signed-in athletes, recommendations use their stated needs.

### Section 5: How it works

Three steps:

1. Tell us what you need.
2. Compare suitable coaches.
3. Reserve a session.

### Section 6: Trust and privacy

A small section—not a wall of badges—explains:

- Coach profiles are reviewed before publication.
- Reviews come from completed bookings.
- Exact meeting locations and private contact details are not public.

### Section 7: Coach invitation

A simple call to action:

> Are you a coach? Build your profile and reach athletes across Pakistan.

Button: `Become a coach`

### Section 8: Minimal footer

- About
- Safety
- Cancellation policy
- Privacy
- Terms
- Contact/support information for the project

### What must not clutter the home page

- Full coach biographies
- Long filter forms
- Complete availability calendars
- Administrator features
- Multiple competing calls to action
- Fake statistics
- Large walls of text
- Auto-playing video
- Pop-ups on first visit

---

## 6. Coach Profile Content

Each coach profile should answer the client's practical questions quickly.

### Profile header

- Professional photograph
- Coach name
- Approved-coach indicator
- Primary sport and specialties
- City/area or `Online`
- Languages
- Average rating and verified review count
- Starting price in PKR
- `View availability` button

### About the coach

- Short biography
- Coaching experience
- Qualifications
- Athlete levels supported: beginner, intermediate, or advanced
- Coaching style

### Services

Each service card shows:

- Service name
- Price in PKR
- Duration
- Online or in-person
- Athlete level
- What is included
- What is not included
- What the athlete should bring
- Facilities or equipment available
- Meeting-area information
- Cancellation policy
- Available times

### Replacement for Airbnb “amenities”

Use these clearer sports-coaching sections:

#### What’s included

Examples:

- One-to-one coaching
- Technique assessment
- Warm-up guidance
- Written session notes
- Use of training cones and balls

#### What to bring

Examples:

- Sports shoes
- Water bottle
- Personal racket
- Protective cricket equipment

#### Facilities and equipment

Examples:

- Indoor court
- Outdoor nets
- Changing room
- Parking nearby
- Coach-provided balls

#### Not included

Examples:

- Venue-entry fee
- Personal sports equipment
- Transport
- Medical or physiotherapy advice
- Follow-up sessions

This prevents misunderstandings before booking.

---

## 7. Location and Contact Privacy

### Should exact coach locations be public?

**No.** Public pages should show only:

- City
- Neighborhood or broad area, if the coach chooses
- Online/in-person status
- Approximate meeting type, such as `Sports club in DHA Lahore`

Do not show:

- Home address
- Exact GPS pin
- Personal training location inside a residence
- Private phone number

After a booking is confirmed, the coach can provide an exact public meeting venue through the booking details. For safety, the MVP should encourage public sports grounds, clubs, gyms, and courts rather than home addresses.

We do not need a map for the MVP. City and area filters are sufficient and cost nothing.

### Should the coach's email be visible?

**No.** A public email address creates:

- Spam and scraping
- Harassment risk
- Platform bypass
- Privacy problems

The public profile should have `View availability` and `Request booking` buttons, not an email address.

For this MVP, contact details can be shown only inside a confirmed booking if necessary. A safer default is to show a coach-provided **business contact method**, not the account-login email. Real-time messaging can be added later.

---

## 8. AI Feature Design Without Paid APIs

### 8.1 Coach recommendations

This is a content-based recommendation system. It compares the athlete's needs with each coach's information.

Athlete preferences:

- Sport
- Goal
- Experience level
- City
- Online or in-person preference
- Maximum budget
- Preferred days

The recommendation score considers:

- Correct sport: required
- Goal/specialty match: high importance
- Experience-level match: high importance
- City or online match: high importance
- Budget match: medium importance
- Availability match: medium importance
- Verified rating: small importance

The result includes an explanation, for example:

> 92% match — specializes in beginner cricket batting, is available in Lahore, and is within your budget.

This system is meaningful, explainable, fast, and costs Rs 0. It does not need user-history tracking or model training.

### 8.2 Natural-language search

Example:

> “I need a beginner cricket batting coach in Lahore under Rs 5,000 who is free on Saturday.”

A local search pipeline will:

1. Recognize sport, city, budget, skill level, day, and online/in-person preference.
2. Use a small local semantic model to understand similar wording.
3. Convert the request into visible filter chips.
4. Search only real coaches in the database.
5. Rank the results and explain the match.

No prompt or search is sent to a paid online AI service.

Fallback behavior:

- If the local model cannot load, ordinary keyword and filter search still works.
- If the request is unclear, the interface asks the user to select missing filters.
- The system never invents coaches or qualifications.

### Later, only if time allows

AI-generated training plans remain in the future backlog. They are not part of the seven-day commitment.

---

## 9. Booking and Cancellation Workflow

### Booking

```text
Athlete chooses service
        ↓
Athlete chooses available time
        ↓
System checks for a conflict
        ↓
Athlete reviews price, location area, inclusions, exclusions, and policy
        ↓
Athlete confirms reservation
        ↓
Booking appears in athlete and coach dashboards
```

No card or payment information is requested.

### Client cancellation

- At least 24 hours before: booking shows `Full refund due if prepaid directly`.
- Less than 24 hours before: booking shows `Outside the full-refund window`.
- The system records cancellation time and policy result.
- The slot becomes available again.

### Coach cancellation

- Booking shows `Full refund due if prepaid directly` regardless of time.
- Client sees a clear apology/status notice.
- The slot becomes unavailable or available according to the coach's remaining schedule.

### Completion and review

- After the session time passes, the booking can be marked complete.
- For the demo, the coach or administrator can mark it complete.
- Only then can that athlete leave one review.

---

## 10. Important Edge Cases

### Accounts and permissions

- Duplicate email address
- Incorrect password
- Suspended coach tries to sign in or edit public profile
- Athlete attempts to access coach or admin pages
- Coach attempts to approve their own profile
- User manually changes a URL to access another user's booking

### Coach profiles

- Missing required fields
- Very long biography
- Invalid or oversized image
- Coach changes profile after approval
- Coach is suspended while future bookings exist
- No qualifications provided
- False or ambiguous “verified” wording

### Search and recommendations

- No coaches match all filters
- User enters misspelled sport or city
- Budget contains commas, `Rs`, `PKR`, or no currency
- Natural-language request contains conflicting requirements
- Local semantic model is unavailable
- New user has no preferences
- Recommendation must not hide all coaches just because there is no perfect match
- Suspended coaches never appear in search or recommendations

### Availability and booking

- Two athletes choose the same slot simultaneously
- Coach edits availability while an athlete is booking
- Past time selected
- Booking crosses midnight
- Coach adds time off over a booked session
- Browser refreshes during confirmation
- User clicks the confirm button repeatedly
- Client and coach use different display time zones
- Pakistan uses PKT; stored times remain unambiguous

### Cancellation

- Exactly 24 hours before the session
- Already-cancelled booking receives another cancellation request
- Coach cancels after the session time
- Client cancels a completed booking
- Cancellation frees the correct time slot
- Policy wording is visible before booking

### Reviews

- Review before session completion
- Second review for the same booking
- Review from a different athlete
- Empty or extremely long review
- Rating outside 1–5
- Coach's rating after a hidden review
- Abusive review moderation

### UI and accessibility

- 360-pixel-wide phone screen
- Very long coach/service names
- Keyboard-only use
- Missing profile image
- Slow page or model loading
- Empty dashboard
- Error messages understandable to a non-technical person
- Buttons cannot be clicked twice accidentally

---

## 11. Seven-Day Phase Plan

The estimate assumes approximately 6–8 focused hours per working day. A 1–2 day contingency should be kept for unexpected problems and final polish.

Every phase ends with:

1. A working application state.
2. Automated tests for the phase.
3. A simple manual test checklist for Ali.
4. A short `PHASE-N-SUMMARY.md` written in plain language.
5. A local Git commit and tag so the project can be restored.
6. No remote GitHub push without explicit permission.

### Phase 0 — Scope, screens, and local safety (0.5 day)

Build/produce:

- Final product requirements
- Simple screen map
- Visual direction and color/type choices
- Final database outline
- Local Git repository
- Baseline tag: `phase-0-plan`

Ali physically tests:

- Opens the screen map/design preview.
- Confirms home-page order.
- Confirms profile information, location privacy, and cancellation wording.

Deliverable brief:

- What will be built
- What will not be built
- Why payments and subscriptions are excluded

### Phase 1 — Foundation and polished home page (1 day)

Build:

- Next.js project
- Shared visual system
- Responsive navigation
- Complete home page
- Seeded coach cards
- SQLite and Prisma foundation
- Docker files
- Basic automated checks

Ali physically tests:

1. Starts the site using one copy-paste command.
2. Opens the local address in Chrome.
3. Checks home page on desktop.
4. Uses Chrome's phone preview.
5. Opens every navigation link.
6. Confirms no clutter, overlap, or horizontal scrolling.

Checkpoint: `phase-1-home`

### Phase 2 — Authentication, roles, and coach profiles (1 day)

Build:

- Register, sign in, and sign out
- Athlete, coach, and administrator roles
- Coach application/profile editor
- Administrator approval
- Public coach profile
- “What's included,” “What to bring,” “Facilities,” and “Not included”
- Hidden private email and exact address

Ali physically tests:

1. Signs in using provided athlete, coach, and administrator accounts.
2. Confirms each role sees the correct dashboard.
3. Edits a coach profile.
4. Approves it as administrator.
5. Confirms unapproved profiles are not public.
6. Confirms public pages do not expose email or exact location.

Checkpoint: `phase-2-profiles`

### Phase 3 — Discovery and both AI features (1.5 days)

Build:

- Browse page
- Normal keyword search
- Sport, city, mode, level, budget, rating, and availability filters
- Explainable coach recommendations
- Natural-language search
- Local semantic matching
- Loading, empty, unclear-query, and model-failure states

Ali physically tests:

1. Filters by each option.
2. Searches with at least ten supplied plain-language examples.
3. Confirms extracted filters appear visibly.
4. Confirms every result is a real coach.
5. Completes preference questions and reviews recommendations.
6. Checks recommendation explanations.
7. Disconnects from the internet and confirms local/fallback search still works after setup.

Checkpoint: `phase-3-discovery-ai`

### Phase 4 — Availability, booking, and cancellations (1 day)

Build:

- Coach weekly availability
- Time-off exceptions
- Service duration and buffer
- Slot generation
- Conflict-safe reservation
- Athlete and coach booking dashboards
- Client and coach cancellation rules
- Refund-eligibility labels without real money movement

Ali physically tests:

1. Adds and removes coach availability.
2. Books an available session.
3. Confirms both dashboards show the same booking.
4. Attempts to book the same slot again.
5. Cancels more than 24 hours before.
6. Tests coach cancellation.
7. Uses a provided test fixture for less-than-24-hour cancellation.
8. Confirms cancelled slots are handled correctly.

Checkpoint: `phase-4-booking`

### Phase 5 — Reviews, edge cases, and UI/UX polish (1 day)

Build:

- Completion workflow
- Verified reviews
- Rating calculation
- Review moderation
- Friendly validation and error states
- Accessibility fixes
- Mobile/tablet/desktop polish
- Representative edge-case tests

Ali physically tests:

1. Tries to review an unfinished booking and sees a clear rejection.
2. Completes a booking and leaves one review.
3. Attempts a duplicate review.
4. Tests long names, missing images, and empty screens.
5. Navigates primary flows using keyboard only.
6. Checks supplied screenshots at phone, tablet, and desktop sizes.

Checkpoint: `phase-5-reviews-polish`

### Phase 6 — Docker, documentation, regression testing, and demo (1 day)

Build/complete:

- Final Docker setup
- Automated unit, database, and browser tests
- Security and permission checks
- README with copy-paste instructions
- Architecture document
- AI design and limitations document
- Five-minute demo script
- Seed/reset command
- Final screenshots

Ali physically tests:

1. Stops and removes the existing local app.
2. Starts it from the README using Docker.
3. Resets to demo data.
4. Follows the complete five-minute demo.
5. Runs one copy-paste test command.
6. Confirms all checks pass.

Checkpoint: `phase-6-release-candidate`

### Schedule summary

| Phase | Focus | Estimate |
|---|---|---:|
| 0 | Scope and screen decisions | 0.5 day |
| 1 | Foundation and home page | 1 day |
| 2 | Authentication and profiles | 1 day |
| 3 | Search, recommendations, natural-language search | 1.5 days |
| 4 | Availability, booking, cancellation | 1 day |
| 5 | Reviews, edge cases, visual polish | 1 day |
| 6 | Docker, documentation, final tests, demo | 1 day |
| **Total** | **Focused work** | **7 days** |
| Buffer | Unexpected problems/polish | 1–2 days |

**Responsible promise:** Aim for a working core in 7 focused days, but reserve 8–9 working days on the calendar. If time becomes shorter, remove optional polish before removing testing, privacy, booking safety, or the two required AI features.

---

## 12. Phase Reversion and Safety

Yes, the project should be divided into phases.

At the end of every phase:

```text
Working code
   +
Passing tests
   +
Manual test checklist
   +
Plain-language summary
   +
Local Git commit and phase tag
```

If a later phase breaks the application, we can compare it with or return to the last known-good phase.

The phase summary will always explain:

- What was added
- What Ali can now do
- Exactly how Ali should test it
- Expected results
- Known limitations
- Any problem encountered and how it was resolved
- The local checkpoint name

“DONE” will be used only when the phase is genuinely implemented and verified.

---

## 13. Software Required

### Already installed on this machine

Verified on the planning date:

- Git 2.43.0
- Node.js 22.23.1
- npm 10.9.8
- Codex CLI 0.146.0
- Hermes Agent 0.19.0

### Missing and required

- **Docker** — currently not installed

Docker is required because the project brief specifically requests a Dockerized application. It also gives Ali one consistent way to start the finished project.

### Recommended but not technically required

- **Google Chrome or Chromium** — for normal and mobile-preview testing
- **Visual Studio Code** — only if Ali wants to inspect files; Hermes/Codex can perform development without it

### Not required

- PostgreSQL application
- Stripe account
- Paid AI account
- Figma subscription
- Vercel subscription
- Supabase subscription
- Redis
- Android Studio
- Xcode
- Separate database-management software

Docker installation will be handled with careful, copy-paste steps before Phase 1 execution. No software will be installed without clearly explaining what it is and why it is needed.

---

## 14. Testing Approach for a Non-Engineer

Ali will not be asked to inspect code to verify features.

Each phase's manual test guide will use this format:

```text
Purpose: What this test proves
Starting point: Which account/page to open
Steps: Numbered clicks and text to enter
Expected result: Exactly what should appear
Failure evidence: Screenshot and visible message to send back
Reset: One command or button to restore demo data
```

Example:

```text
Purpose: Prove that one coach cannot be double-booked.

1. Sign in as the demo athlete.
2. Open Ayesha Khan's profile.
3. Reserve Saturday at 3:00 PM.
4. Sign out and sign in as the second demo athlete.
5. Open the same coach and date.

Expected result:
Saturday at 3:00 PM is no longer available.
```

Automated tests will run behind the scenes, but Ali's acceptance test will always focus on visible behavior.

---

## 15. Five-Minute Demo Outline

### 0:00–0:30 — Introduction

Explain the problem and that CoachConnect connects Pakistani athletes with reviewed sports coaches.

### 0:30–1:20 — Discovery

- Open the polished home page.
- Search: `Beginner cricket batting coach in Lahore under Rs 5,000 available Saturday.`
- Show interpreted filters and real matching coaches.
- Show personalized recommendation explanations.

### 1:20–2:15 — Coach profile

- Open one coach.
- Show qualifications, rating, service price, location area, availability, inclusions, exclusions, equipment, and what to bring.
- Point out that email and exact address are private.

### 2:15–3:10 — Booking

- Choose a service and time.
- Review the cancellation policy and no-online-payment notice.
- Confirm the reservation.
- Show it in athlete and coach dashboards.

### 3:10–3:50 — Coach workflow

- Edit availability.
- Briefly show administrator coach approval.
- Cancel a demonstration booking as coach and show full-refund-due status.

### 3:50–4:25 — Review and trust

- Complete a booking.
- Submit a verified review.
- Show that the rating updates.

### 4:25–5:00 — Engineering quality

- Show Docker startup.
- Show passing tests.
- Explain local zero-cost AI, conflict-safe booking, phase checkpoints, and deliberate scope choices.

---

## 16. Definition of Done

CoachConnect is complete only when:

- All required core features work visibly.
- Coach recommendations and natural-language search work without a paid API.
- Prices use PKR throughout.
- No subscription or paid service is required to run the project.
- The application never asks for real payment details.
- Cancellation policy outcomes are calculated correctly and honestly described.
- Public coach pages do not expose email, exact address, or exact GPS coordinates.
- Service pages clearly show inclusions, exclusions, requirements, and facilities.
- Double booking is prevented.
- Reviews are connected to completed bookings.
- Main flows work at mobile, tablet, and desktop widths.
- Each phase has passing tests, a manual checklist, a summary, and a local Git checkpoint.
- Docker starts the final application from documented copy-paste instructions.
- The README explains setup, architecture, tests, AI limitations, privacy, costs, and future work.
- The five-minute demonstration has been rehearsed.
- No remote GitHub push or deployment occurs without Ali's explicit permission.
