-- Coach capability is moderated once when the initial application is approved.
-- Approved owners may maintain their public profile without returning to the review queue.
-- Existing RLS still prevents applicants from self-approving and keeps submitted,
-- under-review, rejected, and suspended lifecycle boundaries intact.

drop trigger if exists coach_applications_require_review_after_edit
  on public.coach_applications;

drop function if exists public.require_review_after_approved_coach_edit();

comment on table public.coach_applications is
  'Coach applications require initial moderation. Approved owners may publish later profile and schedule edits immediately; administrators retain suspension authority.';
