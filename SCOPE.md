# CoachConnect Scope Management

The project scope may increase or decrease later. This file keeps changes deliberate and reversible.

## Current scope version

**Version:** 0.1 — Phase 0 baseline

The current baseline is defined by:

- `PLAN.md`
- `PRODUCT_REQUIREMENTS.md`
- `SCREEN_MAP.md`

## How scope changes will work

When Ali asks to add, remove, or change something:

1. Record the request in the change log below.
2. Classify it as required now, replacement, optional, or later.
3. Explain the effect on time, testing, interface complexity, and existing work.
4. Identify the earliest affected phase.
5. Update the plan and requirements before implementing the change.
6. Add or revise tests for changed behavior.
7. Preserve the last working Git checkpoint.

Small wording or color changes do not need a schedule re-estimate unless they become repeated redesign work.

## Priority order

If time decreases, preserve work in this order:

1. Authentication and privacy
2. Coach discovery and profiles
3. Availability and safe booking
4. Both required AI features
5. Verified reviews
6. Responsive usability and accessibility
7. Docker, tests, README, and demo
8. Optional visual flourishes
9. AI-generated training plans

Testing, privacy, and booking-conflict protection are not optional polish.

## Change impact labels

- **Tiny:** less than 2 hours; no architecture change
- **Small:** up to half a day; one feature or screen affected
- **Medium:** about 1 day; several files and tests affected
- **Large:** more than 1 day or a core workflow changes

Estimates are revised from actual project state rather than blindly added to the original seven-day number.

## Change log

| Date | Request | Decision | Impact | Affected phase |
|---|---|---|---|---|
| 2026-08-04 | Initial Pakistan/PKR, zero-cost scope | Accepted as baseline | Establishes MVP | Phase 0 onward |
| 2026-08-04 | Scope may increase or decrease later | Accepted; use this change process | Tiny | All phases |
| 2026-08-04 | Select hybrid visual direction | Calm structure with energetic search and primary actions | Small | Phase 1 onward |
| 2026-08-05 | Remove duplicate `Search coaches` navigation action | Keep `Find a Coach` as the single discovery action | Tiny | Phase 1 |
| 2026-08-05 | Show the complete approved coach inventory with sorting and recommendations | Adopt list-first discovery; recommendations rank or highlight but never hide the full list | Medium | Phases 1, 3, and 4 |
| 2026-08-05 | Let one person act as both athlete and coach | Replace the single-role model with one member identity plus separate capabilities and coach approval state | Large | Phases 2 onward |
| 2026-08-05 | Identify bottlenecks and edge cases before each build step | Add explicit performance, permission, concurrency, moderation, and free-service checks to requirements and phase gates | Medium | All phases |

## Current optional backlog

- AI-generated training plans
- Real email notifications
- In-platform messaging
- Map view
- Real payment provider suitable for Pakistan
- Coach packages and subscriptions
- Group coaching
- Native mobile applications
