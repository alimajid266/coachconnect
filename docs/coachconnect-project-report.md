# CoachConnect Project Report

## 1. Project Overview

CoachConnect is a zero-cost sports-coach marketplace designed for Pakistan. Its purpose is to help people discover suitable coaches, compare coaching options, and eventually reserve safe one-to-one sessions without requiring the platform to process payments. The product currently focuses on Karachi, Lahore, Islamabad, and Rawalpindi and supports a broad catalog of team, racquet, combat, endurance, aquatic, strength, and mobility sports.

The central product idea is simple: a visitor should be able to see all approved coaches, narrow the list by sport, city, price, or training format, and understand what each coach offers. A registered member can also apply to become a coach using the same account. Coach access is added as an approved capability rather than replacing the person's normal member access.

### Problem and value

Finding a qualified sports coach is often fragmented across personal referrals and social media. Important information—experience, credentials, prices, availability, training format, and general location—may be incomplete or difficult to compare. CoachConnect brings these details into one consistent marketplace. It also creates a controlled publication process: coach profiles are reviewed before they appear publicly, while private account details and exact locations remain protected.

### Main users

- **Visitors:** browse, search, filter, sort, and compare approved coaches.
- **Members/athletes:** maintain one private account and, in the target MVP, reserve sessions and review completed coaching.
- **Coaches:** use the same member account to create and submit a coaching profile, then manage coaching information after approval.
- **Administrators:** review applications, approve or request changes, suspend listings, and restore eligible profiles. Administrators cannot review their own application.

### Project goals

1. Make coach discovery clear, inclusive, and useful without forcing visitors to search first.
2. Show trustworthy, comparable information such as sports, experience, credentials, price, format, and broad training area.
3. Protect private identity and location data by design.
4. Support one identity with multiple capabilities: every approved coach remains able to use athlete features.
5. Keep the MVP affordable at **Rs 0**, with no paid API or payment-processing dependency.
6. Build a responsive, keyboard-usable web experience that can be tested and deployed reliably.
7. Extend the marketplace later with conflict-safe booking, verified reviews, and explainable recommendations.

### Scope boundaries

CoachConnect displays prices in Pakistani rupees, but it does not collect or hold funds. Payment arrangements and any refund owed are handled directly by the coach. Native mobile apps, subscriptions, real-time chat, video calls, SMS/WhatsApp, exact public addresses, and paid cloud services are outside the current MVP. Under-18 bookings also require a dedicated guardian and safeguarding workflow before launch.

---

## 2. Current Product and Basic Architecture

### Current implemented experience

The current application includes a polished public home page, a dedicated coach catalog, account registration and sign-in, password recovery, self-service account deletion, coach applications, and an administrator review area. The catalog loads approved profiles from Supabase and provides text search, sport, city, training-format, sorting, and optional approximate Mapbox views. Online-only coaches are not placed on the map.

The coach application lifecycle is:

**Draft → Submitted → Under Review → Approved / Changes Requested → Suspended or Restored**

Only approved applications appear in the public catalog. When an approved coach edits public coaching information, the profile returns to review rather than silently publishing unreviewed changes. Bundled coach examples remain limited to isolated interface tests and are not used as production inventory.

### Basic architecture

```text
Visitor / Member / Coach / Administrator
                  |
                  v
        Next.js web application
  pages, forms, catalog, account screens
                  |
                  v
     Next.js server routes and rules
 auth checks, validation, public projection
          |                    |
          v                    v
 Supabase Auth          Mapbox public map
 secure identity        approximate areas only
          |
          v
 Supabase PostgreSQL database
 profiles, coach applications, status history
 Row-Level Security and protected functions
```

### Component responsibilities

- **Next.js 16, React 19, and TypeScript:** provide the responsive website, server-rendered pages, interactive forms, and API routes.
- **Supabase Auth:** manages email/password identities and sessions. The website stores sessions in server-managed HTTP-only cookies, which JavaScript cannot directly read.
- **Supabase PostgreSQL:** stores private member profiles and coach applications. SQL migrations in the repository keep the database structure reproducible.
- **Row-Level Security (RLS):** database rules restrict each member to their own private records and reserve review actions for administrators.
- **Protected database functions:** perform sensitive transitions such as submitting or approving an application and block self-review.
- **Public coach projection:** returns only approved, publication-safe fields. It excludes login email, precise coordinates, reviewer details, and moderation notes.
- **Mapbox GL JS:** displays broad public meeting areas with an origin-restricted browser token; it is an optional discovery aid rather than a source of private location data.
- **Vitest and Testing Library:** test interface behavior, validation, authorization boundaries, and catalog behavior.
- **Docker and Vercel:** Docker provides a hardened loopback-only local runtime; Vercel hosts the public web application. Supabase remains the external identity and data backend.

### Typical data flow

1. A visitor opens the catalog; the Next.js public API calls a restricted Supabase function.
2. The database returns only approved coach fields suitable for publication.
3. The browser filters and presents the coach list and approximate map areas.
4. A member signs in through Supabase; secure cookies carry the session to server routes.
5. A coach applicant saves their own draft and submits it through a protected database transition.
6. An authenticated administrator reviews the application. Approval makes the safe public projection available in the catalog.

### Security and privacy principles

Authorization is enforced at both application and database layers. Registration cannot grant coach or administrator trust. Cross-origin mutation requests are rejected, administrative actions require a verified session, self-review is blocked, and destructive account deletion requires confirmation. Public pages never expose account email, home address, personal phone number, precise GPS coordinates, private credential files, or internal moderation information.

---

## 3. Status, Roadmap, and Summary

### Current status

CoachConnect has a working marketplace foundation. Public discovery, approved-coach publication, account authentication, coach applications, administrator moderation, privacy rules, and deployment infrastructure are implemented. The public deployment is available at **https://coachconnect-sigma.vercel.app**. The project uses real Supabase-backed approved profiles rather than production sample data.

The repository also contains automated checks for linting, TypeScript correctness, unit/interface behavior, database migration expectations, production builds, and package security auditing. Real Supabase policy tests can run with explicitly supplied test credentials; privileged service keys are never permitted in browser code or source control.

### Target MVP roadmap

The broader product requirements describe the next marketplace capabilities:

1. **Detailed public coach profiles and services** — structured session duration, inclusions, exclusions, equipment, price, and availability.
2. **Conflict-safe booking** — a database-confirmed reservation flow that prevents two athletes from taking the same slot and blocks coaches from booking themselves.
3. **Athlete and coach dashboards** — booking history, upcoming sessions, cancellation status, and coach-side management.
4. **Verified reviews** — one review per completed booking, with visible ratings calculated only from legitimate completed sessions.
5. **Explainable recommendations** — local, zero-cost matching based on sport, goal, experience, location or online preference, budget, availability, and rating.
6. **Natural-language search** — convert requests such as “beginner tennis coach in Lahore under Rs 4,000” into visible, editable filters while preserving ordinary search as a fallback.
7. **Reliability and scaling safeguards** — server-side pagination, indexed queries, efficient next-availability summaries, clear backend-unavailable states, and transaction-level booking checks.

These are target capabilities, not all current production features. Payments remain deliberately excluded: CoachConnect records prices and policy outcomes but does not charge users, hold funds, or issue refunds.

### Measures of success

The completed MVP should let a new user understand the service without instruction, browse every approved coach, find a suitable option, compare practical details, reserve a valid session without conflict, and leave one verified review after completion. A coach should be able to join through the same account, pass administrator review, and manage coaching activity without losing member access. The system should preserve privacy, remain responsive at mobile and desktop widths, support keyboard navigation, and run within the Rs 0 operating constraint.

### Key risks and responses

- **Privacy risk:** expose only broad public areas and a restricted coach-data projection.
- **Unauthorized access:** combine secure sessions, server checks, RLS policies, and protected database functions.
- **Double booking:** confirm availability inside one database transaction rather than trusting the browser display.
- **Free-service limits:** minimize queries, show clear outage messages, and avoid unapproved paid upgrades.
- **Recommendation bias:** explain match reasons, preserve the complete catalog, and provide fair discovery for new coaches.
- **Administrative workload:** require complete applications, record reasons, and support a clear review queue.

### Summary

CoachConnect is a focused, privacy-conscious marketplace for connecting people in Pakistan with approved sports coaches. Its architecture intentionally stays simple: one Next.js application, Supabase for identity and protected data, optional Mapbox visualization, and a testable deployment workflow. The strongest design decision is the separation of identity from capability—a person can be an athlete, an approved coach, and, where deliberately authorized, an administrator without maintaining duplicate accounts. The current system establishes the trustworthy discovery and approval foundation; the next major step is to add reliable booking, completion, and verified-review workflows while preserving the project's zero-cost and privacy goals.
