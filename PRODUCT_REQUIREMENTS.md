# CoachConnect Product Requirements — Phase 0 Baseline

## Purpose

CoachConnect helps adults in Pakistan discover suitable sports coaches, understand each service, reserve available sessions, and leave verified reviews.

This is a changeable baseline, not an irreversible contract. Scope changes are managed through `SCOPE.md`.

## Launch baseline

- Country: Pakistan
- Currency: Pakistani rupees, displayed as `Rs 3,000`
- Language: English
- Audience: adults aged 18+
- Sports: cricket, tennis, strength and conditioning
- Cities: Karachi, Lahore, Islamabad/Rawalpindi
- Formats: online and in-person one-to-one coaching
- Cost to run locally: Rs 0
- Payment processing: excluded

## Roles

### Visitor

- View the home page.
- Browse approved coaches.
- Search and filter coaches.
- View public coach profiles.
- Register or sign in to reserve a session.

### Athlete

- Maintain basic coaching preferences.
- Receive explainable recommendations.
- Use ordinary and natural-language search.
- Reserve an available session.
- View and cancel own bookings.
- Review a coach once after a completed booking.

### Coach

- Create and edit a profile.
- Submit the profile for administrator approval.
- Create services in PKR.
- State inclusions, exclusions, equipment, and what to bring.
- Set weekly availability and time off.
- View and cancel own bookings.
- Mark a past session complete.

### Administrator

- Approve, reject, suspend, and restore coaches.
- View booking records.
- Mark a demo booking complete with a reason.
- Hide abusive reviews without deleting their history.

## Required user journeys

### Discover and reserve

1. Athlete describes what they need.
2. Search displays visible interpreted filters.
3. Athlete compares real approved coaches.
4. Athlete opens a profile and service.
5. Athlete selects an available time.
6. Athlete reviews price, general location, inclusions, exclusions, and cancellation policy.
7. Athlete confirms a reservation without entering card details.
8. Reservation appears in athlete and coach dashboards.

### Coach joins marketplace

1. Coach creates an account.
2. Coach completes a profile and services.
3. Coach submits for review.
4. Administrator approves or rejects it.
5. Only approved profiles become public.

### Verified review

1. Session time passes.
2. Coach or administrator marks booking complete.
3. The booked athlete leaves one 1–5 star review.
4. Public rating updates from visible verified reviews.

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
- Plain-language testing guides after every phase.

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
