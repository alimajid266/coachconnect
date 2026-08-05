# CoachConnect

CoachConnect is a narrowly scoped sports-coach marketplace MVP for adults in Pakistan. The launch sports are cricket, tennis, and strength & conditioning; the launch locations are Karachi, Lahore, and Islamabad/Rawalpindi.

## Current status

- Phase 1 home/search/profile preview: complete and checkpointed at `phase-1-home`.
- Eye-catching athletic home refresh: implemented.
- Phase 2: Supabase account foundation in progress.
- Public deployment: not performed.
- Monetary cost: Rs 0.

All coaches, ratings, availability, and recommendation labels currently shown on the home page are fictional sample data.

## Architecture

- Next.js 16, React 19, TypeScript
- Supabase Auth for identities and sessions
- Supabase PostgreSQL with Row-Level Security for private account/profile data
- `@supabase/ssr` with server-managed HTTP-only cookies
- Vitest and Testing Library
- Hardened loopback-only Docker runtime
- Prisma/SQLite retained only for the original Phase 1 sample repository while marketplace data moves to Supabase

Supabase SQL migrations live in `supabase/migrations/`. The first migration creates private account profiles, maps current Auth users to an initial athlete/coach onboarding role, blocks public admin self-assignment, and restricts profile access with RLS.

The approved product model now uses one member identity with athlete access by default and optional coach/admin capabilities. The current single `role` column is transitional and must be migrated before dual athlete/coach behavior is considered complete.

## Supabase project setup

1. Create one Supabase **Free** project.
2. In the project dashboard, keep email/password authentication enabled.
3. For this Rs 0 MVP, disable mandatory email confirmation so registration does not depend on paid/custom SMTP.
4. Copy `.env.example` to `.env.local`.
5. Add the project URL and **publishable** key. Never add the secret/service-role key to the web application.
6. Link the CLI and apply committed migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The Free plan may pause an inactive project after one week. No paid upgrade is authorized.

> Security note: the Supabase CLI's default local stack publishes development ports on all network interfaces. It was stopped after verification and should not be started on an untrusted network without explicit loopback/firewall isolation.

## Local development

```bash
npm ci
cp .env.example .env.local
# Fill only SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
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
```

The real Supabase policy test in `tests/supabase-auth.integration.test.ts` runs only when `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and a test-only `SUPABASE_SERVICE_ROLE_KEY` are explicitly supplied. The service-role key must never be exposed to the browser or committed.

## Docker

```bash
docker compose up --build -d
docker compose ps
```

Compose optionally reads ignored `.env.local`, publishes only `127.0.0.1:3000`, runs as `node`, uses a read-only root filesystem, drops all Linux capabilities, and enables `no-new-privileges`.

## Privacy and payments

- Public profiles never show account email, exact home address, private residential location, or precise GPS coordinates.
- CoachConnect never holds payment funds. Athletes arrange payment directly with coaches.
- If a direct prepayment is refundable, the coach—not CoachConnect—must issue the refund.
- Client cancellation at least 24 hours before: full refund due if prepaid directly.
- Client cancellation under 24 hours: outside the full-refund window.
- Coach cancellation: full refund due if prepaid directly.
