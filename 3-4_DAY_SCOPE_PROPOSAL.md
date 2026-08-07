# CoachConnect — 3–4 Day Release Scope Proposal

**Status:** Proposed scope cut for Ali’s approval  
**Deadline:** 3–4 focused working days  
**Decision principle:** A complete, demonstrable marketplace journey is more valuable than many half-finished features.

## 1. Current verified position

Verified on 2026-08-06 from `/home/ali/coachconnect`:

- ESLint passes.
- TypeScript passes.
- 82/82 automated tests pass.
- Next.js production build passes.
- Public catalog, filters, sorting, detailed profiles, approximate Mapbox view, account flows, coach application, administrator review, and account deletion are present locally.
- Coach/application integration tests pass against the configured test backend.
- The current worktree contains substantial uncommitted changes and must be reviewed and checkpointed before new feature work.
- The public Vercel release is behind the local repository.
- Hosted Supabase migration and production end-to-end account verification remain the first external deployment gate.
- Public discovery is still fixture-backed rather than driven by approved hosted coach profiles.
- Natural-language AI search, real recommendation scoring, persistent booking/cancellation, and verified reviews are not implemented.

## 2. Recommended release story

A visitor can browse approved coaches, use normal or plain-English search, understand why coaches match, create one account, apply as a coach, receive administrator approval, and reserve/cancel one conflict-safe coaching session without online payment.

This is the smallest release that demonstrates:

1. A real two-sided marketplace.
2. Safe identity and coach approval.
3. Two explainable AI-style differentiators.
4. A real marketplace transaction without payment complexity.
5. Privacy, authorization, and data integrity.

## 3. Keep in the 3–4 day release

### Already built — stabilize rather than redesign

- Polished responsive home page.
- Public coach catalog and detailed profiles.
- Existing approximate Mapbox view.
- Supabase registration, sign-in, recovery, logout, and account deletion.
- One member identity with optional coach capability.
- Coach application and administrator approval/suspension workflow.
- Existing privacy controls and broad-area-only public locations.
- Existing automated tests and Docker development verification.

### Required new work

1. **Production data connection**
   - Apply reviewed Supabase migrations.
   - Make approved active coach profiles appear in public discovery.
   - Ensure draft, rejected, and suspended profiles never appear.

2. **Natural-language search — simplified and explainable**
   - Parse sport, city, mode, budget, skill level, goal, and day from plain English.
   - Use a local synonym/intent dictionary for similar wording.
   - Display editable interpreted filters.
   - Fall back to ordinary search when interpretation is unclear.
   - Do not add a large ML model, vector database, or paid AI API.

3. **Explainable recommendations — deterministic**
   - Hard eligibility: approved, active, correct sport.
   - Score goal/specialty, level, city/online mode, budget, and availability.
   - Return a visible reason for every recommended coach.
   - Use a neutral default for signed-out/new members.
   - Never hide the complete coach list.

4. **Minimal persistent booking and cancellation**
   - Use simple bookable slots based on current coach availability.
   - Recheck the slot in PostgreSQL during confirmation.
   - Prevent two athletes from booking the same slot.
   - Show the booking in athlete and coach dashboards.
   - Support athlete and coach cancellation.
   - Record the existing 24-hour policy label.
   - Do not process payments or claim CoachConnect issued a refund.

5. **Release hardening**
   - Production browser tests at phone and desktop sizes.
   - Permission, privacy, duplicate-action, paused-backend, and AI-fallback checks.
   - Final security review, Vercel deployment, README update, and five-minute demo.

## 4. Remove from this deadline

Move these to later even if they remain in architecture documents:

- AI-generated training plans.
- A downloadable transformer/LLM, embeddings, or vector database.
- Learning recommendations from click or booking history.
- Distance/radius search and route calculation.
- Advanced coach time-off, buffers, recurring packages, or group sessions.
- Verified review creation, rating recalculation, and moderation workflow.
- Qualification-document uploads and Supabase Storage.
- Real email notifications beyond Supabase account emails.
- SMS, WhatsApp, chat, video calls, payments, subscriptions, and payouts.
- Analytics platform, recommendation experimentation, and automated moderation.
- Native mobile applications.
- Additional visual redesigns or architecture-document expansion.

### Keep only if already working

The current Mapbox view and account-deletion flow may stay because their tests pass. Do not expand them during the deadline.

## 5. Four-day schedule

### Day 1 — Freeze, cloud foundation, and public profile connection

- Reconcile and independently review the current uncommitted tree.
- Create a verified Git checkpoint before new work.
- Authenticate the Supabase owner session.
- Apply account, coach-application, and account-deletion migrations.
- Verify real registration, sign-in, coach application, admin approval, and RLS.
- Connect approved profiles to the public catalog.
- Deploy and smoke-test this stable baseline.

**Stop rule:** If Supabase owner access is unavailable within the first few hours, do not build more cloud-dependent features. Preserve a truthful read-only demonstration release instead.

### Day 2 — Both explainable AI features

- Implement the natural-language parser test-first.
- Show editable interpreted filters.
- Implement deterministic recommendation scoring and reasons.
- Add no-results, unclear-input, new-user, suspended-coach, and fallback tests.
- Browser-test at least ten representative searches.

**Stop rule:** Do not add a transformer model if it threatens reliability, bundle size, Vercel cold starts, or the ordinary-search fallback.

### Day 3 — Minimal safe booking

- Add the smallest booking/slot schema and database constraint.
- Implement confirmation as one conflict-safe transaction.
- Add athlete and coach booking views.
- Add athlete/coach cancellation and policy labels.
- Test repeated clicks, two-user conflict, self-booking, unauthorized access, and cancellation idempotency.

**Stop rule:** If conflict protection cannot be proven in PostgreSQL, ship selection/request UI honestly but do not call it a completed reservation.

### Day 4 — Release candidate only

- No major new feature work.
- Fix release-blocking defects.
- Run complete automated and hosted integration suites.
- Verify production deployment identity and public URL.
- Browser-test the five-minute demonstration.
- Check mobile layout, keyboard use, console, privacy, error states, and Supabase pause handling.
- Update README, scope status, known limitations, and demo script.
- Create verified release checkpoint and deploy.

### If only three days are available

Combine final release checks into the end of Day 3 and reduce booking to:

- one service duration;
- a small set of fixed future slots;
- book, view, and cancel only;
- no coach schedule editor beyond the existing declared availability.

Do not cut database conflict protection, authorization tests, or production verification.

## 6. Definition of done

The release is done only when this exact public flow is verified:

1. Browse every approved active coach.
2. Enter a plain-English need and see editable interpreted filters.
3. See ranked coaches with truthful reasons while retaining the full list.
4. Register/sign in with a real intended account.
5. Submit a coach application and approve it through an administrator account.
6. Confirm the approved coach becomes public and private data stays private.
7. Reserve an available slot once; a second user cannot claim the same slot.
8. See the booking in both dashboards and cancel it with correct policy wording.
9. Complete the five-minute demonstration on the production URL with no console errors.
10. Pass focused, full, security, integration, build, and browser release gates.

## 7. Main risks

1. **Supabase owner authentication:** currently the critical external blocker for production schema work.
2. **Dirty worktree:** 727 added/changed lines are green but not yet independently reviewed or checkpointed.
3. **Fixture-backed catalog:** coach approval currently does not prove end-to-end marketplace publication.
4. **Booking concurrency:** must be enforced in the database, not merely disabled in the browser.
5. **AI overreach:** a large model would consume the schedule without improving the core demonstration.
6. **Scope creep:** no new maps, redesigns, training plans, reviews, payments, or messaging during this release window.

## 8. Approval decision

Recommended decision:

> Approve the four-day core: stabilize/cloud-connect current work, connect approved profiles to discovery, implement explainable natural-language search and recommendations, add one conflict-safe booking/cancellation flow, then reserve the final day for production hardening.

After approval, update `PLAN.md`, `PRODUCT_REQUIREMENTS.md`, and `SCOPE.md` to make this the canonical release scope before implementation begins.
