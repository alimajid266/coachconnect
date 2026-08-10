# CoachConnect

CoachConnect is a sports-coach marketplace MVP for adults in Pakistan. The prototype catalog spans team, racquet, combat, endurance, aquatic, strength, and mobility sports across Karachi, Lahore, and Islamabad/Rawalpindi. One coach profile may represent multiple sports when the coach has the relevant capability.

## Current status

- Simple public home page and dedicated `/coaches` catalog are implemented.
- The catalog reads approved coach profiles from Supabase and supports typo-tolerant natural-language search, city, sport, format, and sorting controls without an external AI request.
- Signed-in members' saved interests, city, level, budget, and goal rank matching profiles first. The top four positive matches carry a visible **Recommended** tag in the card's upper-left corner; typed search criteria take priority.
- The optional Mapbox view keeps visible coach cards synchronized with approximate public training areas; online-only coaches are not pinned.
- Supabase account foundation and Phase 2B coach applications are implemented. Members can save and submit applications; administrators can review, approve, request changes, remove listings, or restore them.
- Bundled coach fixtures are retained only for isolated UI tests and are not published by the production catalog.
- Public deployment: `https://coachconnect-sigma.vercel.app`.
- Monetary cost: Rs 0.

### Required baseline status

| Capability | Status | Current boundary |
|---|---|---|
| User authentication | **Live** | Supabase email/password accounts and server-managed sessions |
| Browse and search coaches | **Live** | Approved catalog, ordinary filters, typo-tolerant natural-language interpretation |
| Coach profiles | **Live** | Dedicated public profile routes with publication-safe fields |
| Explainable coach recommendations | **Live in current code** | Saved member preferences rank positive matches first with visible reasons and tags; no AI API call |
| Natural-language search | **Live in current code** | Deterministically extracts sport, city, level, format, budget, day, and goals; corrections remain editable |
| Booking system | **Implemented** | Conflict-safe request, acceptance, cancellation, completion, participant schedules, private meeting details, and cancellation-policy outcomes |
| Coach availability management | **Implemented** | Approved coaches can add and remove slots; database serialization protects booking, suspension, deletion, and cross-role schedule conflicts |
| Ratings and reviews | **Implemented** | Athletes may submit one permanent verified review per completed booking; it cannot be edited or submitted twice |
| Dockerized application | **Implemented locally** | The Next.js application is containerized with a hardened loopback-only Compose workflow; Supabase, Mapbox, and optional Gemini training plans remain managed external services |
| Maintained documentation | **Required continuously** | Requirements, plan, scope, README, screens, and architecture must change with the code |

The zero-cost discovery baseline is satisfied by **explainable deterministic recommendations** and **natural-language search**. Gemini is not used for coach search or ranking. AI-generated training plans remain an optional, separate feature.

## Documentation map

- `PRODUCT_REQUIREMENTS.md` — authoritative product and quality requirements
- `PLAN.md` — delivery order, architecture decisions, and verification gates
- `SCOPE.md` — scope-change log and priority order
- `SCREEN_MAP.md` — intended routes and screen responsibilities
- `README.md` — current implementation status, setup, privacy, and verification

Every feature change must update the affected documentation in the same reviewed change. Status language must remain explicit: **Live**, **In progress**, or **Planned**.

## Architecture

- Next.js 16, React 19, TypeScript
- Supabase Auth for identities and sessions
- Supabase PostgreSQL with Row-Level Security for private account/profile data
- `@supabase/ssr` with server-managed HTTP-only cookies
- Vitest and Testing Library
- Mapbox GL JS with an origin-restricted public browser token
- Hardened loopback-only Docker runtime
- Prisma/SQLite retained only for the original Phase 1 sample repository while marketplace data moves to Supabase

Supabase SQL migrations live in `supabase/migrations/`. The account migration creates private member profiles and restricts them with RLS. The Phase 2B migration adds member-owned coach applications, protected submission and administrator-review functions, additive coach capability, and the `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `SUSPENDED` lifecycle.

The product uses one member identity with ordinary customer access plus optional coach or administrator capabilities. Registration cannot grant a trusted capability. The legacy `role` column remains transitional compatibility storage; coach state comes from the protected application lifecycle.

## Supabase project setup

1. Create one Supabase **Free** project.
2. In the project dashboard, keep email/password authentication enabled.
3. For this Rs 0 MVP, disable mandatory email confirmation so registration does not depend on paid/custom SMTP.
4. Copy `.env.example` to `.env.local`.
5. Add the project URL, **publishable** key, and the public `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`. Add `GEMINI_API_KEY` only if optional training-plan generation is required. Never expose a Supabase service-role key, Gemini key, or Mapbox secret token to browser code.
6. Link the CLI and apply committed migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

7. In **Authentication → URL Configuration**, set the production Site URL and add both recovery callbacks:
   - `https://coachconnect-sigma.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

Password recovery cannot safely return to production unless the exact Vercel callback is allowlisted.

The Free plan may pause an inactive project after one week. No paid upgrade is authorized.

> Security note: the Supabase CLI's default local stack publishes development ports on all network interfaces. It was stopped after verification and should not be started on an untrusted network without explicit loopback/firewall isolation.

## Administrator access and powers

Registration never grants administrator access. Bootstrap a dedicated administrator account deliberately:

1. Register a separate CoachConnect account and copy its UUID from **Supabase Dashboard → Authentication → Users**.
2. Open **Table Editor → public → profiles**, find the same UUID, change `role` to `ADMIN`, and save.
3. Sign in with that account and open `/admin/coaches`. Do not use the applicant's own account; self-review is blocked in the database.

Administrators can view non-draft applications, mark submissions under review, approve them, request changes with a reason, remove approved coach listings from the catalog, and restore removed listings. Removal uses the audited `SUSPENDED` state and preserves the underlying member account. Administrators cannot hard-delete another member's identity; members control permanent self-service account deletion from **My Account**.

## Local development

```bash
npm ci
cp .env.example .env.local
# Fill SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
npm run dev
```

Open <http://127.0.0.1:3000>.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run test:phase0
npm run build
npm audit --audit-level=high
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

`/api/health` is the process liveness check. `/api/ready` additionally verifies that Supabase can serve the required public catalog function.

The real Supabase policy test in `tests/supabase-auth.integration.test.ts` runs only when `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a test-only `SUPABASE_SERVICE_ROLE_KEY` are explicitly supplied. The service-role key must never be exposed to the browser or committed.

## Docker

Docker packages the CoachConnect **web application** with the Node.js version and production dependencies it needs. This lets another person run the same build without installing Node.js manually. It does not contain member data, secret keys, Supabase, Mapbox, Gemini, or the Vercel deployment.

### Run it with Docker Desktop

1. Install and open [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. Download or clone this repository.
3. Copy `.env.example` to `.env.local` and fill in the required Supabase and Mapbox values. Use a hosted Supabase URL; `127.0.0.1` inside a container points back to the container itself.
4. From the CoachConnect folder, run:

```bash
docker compose up --build -d
docker compose ps
```

5. Open <http://127.0.0.1:3000>.

Useful commands:

```bash
docker compose logs -f web  # View live application output; press Ctrl+C to leave
docker compose down         # Stop and remove the CoachConnect container
docker compose up -d        # Start an already-built container again
```

Compose optionally reads ignored `.env.local`, publishes only `127.0.0.1:3000`, runs as `node`, uses a read-only root filesystem, drops all Linux capabilities, and enables `no-new-privileges`.

Compose contains the **web application only**. Hosted Supabase (authentication/database), Mapbox, and optional Gemini training-plan generation are external services and are configured through environment variables rather than additional local containers. This is intentional for the Rs 0 hosted MVP.

### Share it safely

- Share the GitHub repository or a ZIP made from the repository.
- Include `.env.example`; never share or upload `.env.local`.
- The recipient must supply valid service settings before authentication, maps, and optional AI plans will work.
- `Dockerfile`, `compose.yaml`, and `.dockerignore` are the complete Docker setup. `docker compose up --build -d` builds it locally, so no prebuilt image is required.

## Privacy and payments

- Public profiles never show account email, exact home address, private residential location, or precise GPS coordinates.
- Public map pins represent general neighborhoods or public training areas; exact meeting details belong in the booking workflow.
- CoachConnect never holds payment funds. Athletes arrange payment directly with coaches.
- If a direct prepayment is refundable, the coach—not CoachConnect—must issue the refund.
- Client cancellation at least 24 hours before: full refund due if prepaid directly.
- Client cancellation under 24 hours: outside the full-refund window.
- Coach cancellation: full refund due if prepaid directly.
