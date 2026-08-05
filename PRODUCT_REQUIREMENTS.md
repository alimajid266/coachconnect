# CoachConnect Product Requirements — Phase 0 Baseline

## Purpose

CoachConnect helps people in Pakistan discover suitable sports coaches, understand each service, reserve available sessions, and leave verified reviews.

This is a changeable baseline, not an irreversible contract. Scope changes are managed through `SCOPE.md`.

## Launch baseline

- Country: Pakistan
- Currency: Pakistani rupees, displayed as `Rs 3,000`
- Language: English
- Audience: children, teenagers, adults, and seniors. A guardian-managed booking and safeguarding workflow is required before real under-18 bookings launch.
- Sports: broad, extensible catalog across team, racquet, combat, endurance, aquatic, strength, and mobility sports
- Coach capabilities: one approved coach profile may list multiple verified sports
- Cities: Karachi, Lahore, Islamabad/Rawalpindi
- Formats: online and in-person one-to-one coaching
- Cost to run locally: Rs 0
- Payment processing: excluded

## Accounts and capabilities

CoachConnect uses **one account per person**, not separate athlete and coach accounts. "Athlete" and "coach" are capabilities that can exist together.

Registration creates a neutral member account. It does not ask the person to choose a permanent athlete or coach account type. Every member can immediately find and book coaching; offering coaching begins from the same dashboard and requires a separate coach-profile application and approval.

### Visitor

- View the home page.
- Browse the full list of approved, active coaches by default.
- Sort, search, and filter that list.
- View public coach profiles.
- Register or sign in to reserve a session.

### Member / athlete capability

Every registered member can act as an athlete, including an approved coach.

- Maintain basic coaching preferences.
- Receive explainable recommendations.
- Browse every approved coach; recommendations never replace or hide the full list.
- Use ordinary and natural-language search.
- Reserve an available session, except their own service.
- View and cancel own bookings.
- Review another coach once after a completed booking.

### Coach capability

Any registered member may start a coach application from the same account. Approval adds coach tools without removing athlete tools.

- Create and edit a coach profile draft.
- Submit the profile for administrator approval.
- Create services in PKR.
- State inclusions, exclusions, equipment, and what to bring.
- Set weekly availability and time off.
- View and cancel bookings for their services.
- Mark an eligible past session complete.
- Continue browsing and booking other coaches as an athlete.

A suspended or rejected coach keeps normal athlete access unless the entire account is separately suspended for a safety reason.

### Administrator capability

Administrator access is granted through a protected process and cannot be self-selected.

- Approve, reject, suspend, and restore coaches.
- View booking records required for support.
- Mark a demo booking complete with a reason.
- Hide abusive reviews without deleting their history.
- Never approve, moderate, or review their own coach profile, booking, or review.

### Capability rules

- Do not ask an existing member to create a second account to become a coach or athlete.
- Do not use registration intent as authorization. Coach tools depend on coach-profile status and approval.
- Email identity, private profile, and sign-in session remain shared.
- Athlete preferences and coach business data remain separate.
- Becoming a coach means adding coach tools, not changing or replacing the account.
- A coach cannot book, rate, or review their own service.
- Coach suspension removes public coach visibility and coach actions, not ordinary athlete access.
- Full account suspension is a separate administrator action with a recorded reason.

### Public coach-profile information

Each public coach profile should clearly show:

- Sports taught, location, lesson format, price, and weekly availability.
- Verified reviews and the number of lessons taught.
- Age groups taught: children, teenagers, adults, and seniors.
- Supported levels: beginner, intermediate, and advanced. Level-specific catalog filtering and individually varied level offerings are deferred.
- Years of coaching experience and credentials.
- A concise typical lesson plan.
- Expandable frequently asked questions covering suitability, equipment, and lesson duration.

## Required user journeys

### Discover and reserve

1. The page loads a browsable list of every approved, active coach; search is not required to see inventory.
2. The athlete may sort by Recommended, Rating, Price low-to-high, Price high-to-low, or Earliest availability.
3. The athlete may search, filter, or describe what they need in plain English.
4. Search displays visible interpreted filters and updates the same coach list.
5. Recommendations clearly explain their reasons but never hide the complete list.
6. The athlete compares real approved coaches.
7. The athlete opens a profile and service.
8. The athlete selects an available time.
9. The athlete reviews price, general location, inclusions, exclusions, and cancellation policy.
10. The athlete confirms a reservation without entering card details.
11. The reservation appears in athlete and coach dashboard areas.

### Coach joins marketplace

1. Member creates the same neutral account used by every other member.
2. Member chooses to offer coaching and completes a coach profile and services.
3. Coach submits for review.
4. Administrator approves or rejects it.
5. Only approved profiles become public.

### Verified review

1. Session time passes.
2. Coach or administrator marks booking complete.
3. The booked athlete leaves one 1–5 star review.
4. Public rating updates from visible verified reviews.

## Discovery, sorting, and recommendation requirements

### Full list first

- The coach area shows all approved, active coaches before a search is entered.
- "Find a Coach" is the single navigation action for discovery; do not add a duplicate "Search coaches" navigation button.
- Recommendations may appear as a clearly labeled section or as the default Recommended sort, but the complete list remains reachable in one action.
- Filters narrow the list transparently and can be removed individually or cleared together.
- The result count and active sort are always visible.
- When the list grows, use page-based loading or a clear Load more control; do not download every coach into the browser.

### Sorting rules

- Recommended: personalized when signed in and preference data exists; otherwise uses a documented public ranking.
- Rating: use verified visible reviews only, with a minimum-review confidence rule so one five-star review does not automatically outrank a well-established coach.
- Price: use the lowest active service price and display what that price represents.
- Earliest availability: use the next genuinely bookable slot, not a manually typed date.
- All sorts use coach ID as a final stable tie-breaker so results do not jump between pages.
- Suspended, rejected, draft, and unavailable-for-publication coaches never appear.

## AI requirements

### Explainable coach recommendations

Recommendations compare sport, goal, experience, location/mode, budget, availability, and rating. Every recommendation states why it matches. No paid external API is required.

### Natural-language search

A local search pipeline extracts supported needs from plain English, shows them as editable filters, and searches only existing approved coaches. Ordinary search remains available if semantic matching cannot load.

## Privacy decisions

Public coach pages may show:

- Coach name and professional photo
- City and optional broad area
- Sports, specialties, languages, qualifications summary
- Services, prices, availability, and reviews

Public pages must not show:

- Account-login email
- Personal phone number
- Home address
- Exact GPS pin
- Private qualification files

An exact public meeting venue or separate business contact method may be revealed inside a confirmed booking.

## Cancellation baseline

- Athlete cancels at least 24 hours before: `Full refund due if prepaid directly`.
- Athlete cancels less than 24 hours before: `Outside full-refund window`.
- Coach cancellation: `Full refund due if prepaid directly`.

CoachConnect does not hold money in this MVP and cannot issue a financial refund. It records and explains policy eligibility.

## Quality requirements

- Responsive at 360 px, 768 px, and 1440 px widths.
- Main flows usable with keyboard only.
- Clear labels, focus states, validation, and empty/error states.
- No horizontal scrolling at target widths.
- No double booking.
- No unauthorized cross-account access.
- Dockerized final application.
- Unit, database, and browser tests.
- Brief plain-language testing steps delivered in chat after every phase.

## Bottlenecks and required safeguards

### Coach-list growth

Risk: Loading every coach, service, review, and available slot will become slow and expensive.

Safeguards:

- Ask Supabase only for the current page of public summary fields.
- Load full profile, reviews, and availability only when needed.
- Add database indexes for publication state, sport, city, price, rating summary, and next availability.
- Measure slow queries before adding caches.

### Availability calculation

Risk: Calculating future slots for every coach on every list request is expensive and can show stale times.

Safeguards:

- Store weekly rules and exceptions separately.
- Keep a small next-available summary for list sorting.
- Recheck the real slot inside the final booking transaction.

### Booking concurrency

Risk: Two athletes may select the same slot almost together.

Safeguards:

- Enforce a database uniqueness or overlap rule.
- Make repeated confirmation safe.
- Treat the browser's availability display as advisory until the database confirms.

### Recommendation cold start and bias

Risk: New users have no preferences, new coaches have no reviews, and popular coaches can permanently dominate.

Safeguards:

- Provide a neutral public ranking for signed-out and new users.
- Explain recommendation reasons.
- Do not hide the full list.
- Give new approved coaches a fair discovery path without pretending they have ratings.
- Monitor whether one city, sport, price band, or coach receives unreasonable exposure.

### Multiple capabilities

Risk: A single role field cannot safely represent someone who is both an athlete and coach.

Safeguards:

- Store capabilities separately from identity.
- Keep coach approval and suspension state in the coach profile, not in the member's base account role.
- Test every permission combination.
- Block self-booking, self-review, and self-approval.

### Supabase Free limits and email dependence

Risk: The project may pause after inactivity, reach free limits, or fail to deliver account emails.

Safeguards:

- Show clear service-unavailable messages.
- Keep health and real workflow checks separate.
- Avoid unnecessary queries and large images.
- Test email confirmation and recovery against the real project.
- Do not upgrade or spend money without approval.

### Administrator workload

Risk: Coach approval and moderation can become a manual queue.

Safeguards:

- Require complete applications before submission.
- Show missing fields clearly.
- Keep recorded reasons and an audit history.
- Add queue filters before adding automation.

## Out of scope now

- Online payments and payouts
- Subscriptions
- Native mobile applications
- In-app video, chat, SMS, WhatsApp, or real email delivery
- Public exact maps
- Group sessions and recurring packages
- AI training-plan generation unless time remains after the required release candidate
- Medical or rehabilitation advice
- Paid cloud services

## MVP success criteria

The MVP succeeds when a new reviewer can start it locally, understand the home page without instruction, find a suitable real seeded coach using either AI feature, reserve a conflict-free session, observe privacy and cancellation rules, complete the booking, submit one verified review, and run the documented tests for Rs 0.
