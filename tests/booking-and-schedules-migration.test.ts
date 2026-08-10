import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("supabase/migrations/20260806164000_booking_and_schedules.sql", "utf8");
const safetySql = readFileSync("supabase/migrations/20260806165000_booking_safety_completion.sql", "utf8");
const conflictSql = readFileSync("supabase/migrations/20260807051000_booking_request_slot_conflict_message.sql", "utf8");
const reviewSql = readFileSync("supabase/migrations/20260807053000_availability_completion_reviews.sql", "utf8");
const refundSql = readFileSync("supabase/migrations/20260808010000_demo_payment_totals_and_refunds.sql", "utf8");

describe("booking and schedule migration", () => {
  it("keeps booking writes behind authenticated RPCs and RLS", () => {
    expect(sql).toMatch(/alter table public\.coach_availability_slots enable row level security/i);
    expect(sql).toMatch(/alter table public\.coach_bookings enable row level security/i);
    expect(sql).toMatch(/revoke all on public\.coach_availability_slots from anon, authenticated/i);
    expect(sql).toMatch(/revoke all on public\.coach_bookings from anon, authenticated/i);
    expect(sql).not.toMatch(/grant (?:insert|update|delete).*coach_bookings/i);
  });

  it("serializes slot creation and prevents overlapping or duplicate active bookings", () => {
    expect(sql).toMatch(/pg_advisory_xact_lock/i);
    expect(sql).toMatch(/tstzrange\(slot\.starts_at, slot\.ends_at, '\[\)'\)\s*&&\s*tstzrange/i);
    expect(sql).toMatch(/create unique index coach_bookings_one_active_request_per_slot/i);
    expect(sql).toMatch(/where status in \('REQUESTED', 'CONFIRMED'\)/i);
    expect(conflictSql).toMatch(/for update[\s\S]*booking\.slot_id = target_slot\.id[\s\S]*status in \('REQUESTED', 'CONFIRMED'\)[\s\S]*slot is no longer available/i);
  });

  it("requires approval, coach acceptance, and participant-bound state transitions", () => {
    expect(sql).toMatch(/status = 'APPROVED'/i);
    expect(sql).toMatch(/respond_to_coach_booking/i);
    expect(sql).toMatch(/booking\.coach_user_id = \(select auth\.uid\(\)\)/i);
    expect(sql).toMatch(/actor_id in \(coach_user_id, athlete_user_id\)/i);
    expect(sql).toMatch(/payment_status text not null default 'NOT_COLLECTED'/i);
  });

  it("enforces the requested lifecycle, expires elapsed requests, and allows only ended completion", () => {
    for (const status of ["REQUESTED", "CONFIRMED", "DECLINED", "CANCELLED_BY_ATHLETE", "CANCELLED_BY_COACH", "COMPLETED", "EXPIRED"]) expect(sql).toContain(`'${status}'`);
    expect(sql).toMatch(/slot\.ends_at <= clock_timestamp\(\)/i);
    expect(sql).toMatch(/starts_at > clock_timestamp\(\)/i);
    expect(safetySql).toMatch(/set status = 'EXPIRED'[\s\S]*booking\.status = 'REQUESTED'[\s\S]*slot\.starts_at <= clock_timestamp\(\)/i);
  });

  it("rechecks approval during acceptance and serializes suspension against requests", () => {
    expect(safetySql).toMatch(/from public\.coach_applications[\s\S]*for share/i);
    expect(safetySql).toMatch(/accept_booking[\s\S]*application\.status <> 'APPROVED'/i);
  });

  it("uses one account-first lock order for request, slot creation, acceptance, and deletion", () => {
    expect(safetySql).toMatch(/request_coach_booking[\s\S]*least\(athlete_id, target_coach_id\)[\s\S]*greatest\(athlete_id, target_coach_id\)[\s\S]*for share[\s\S]*for update/i);
    expect(safetySql).toMatch(/create_coach_availability_slot[\s\S]*pg_advisory_xact_lock[\s\S]*from public\.coach_applications[\s\S]*for share/i);
    expect(safetySql).toMatch(/respond_to_coach_booking[\s\S]*pg_advisory_xact_lock[\s\S]*from public\.coach_applications[\s\S]*for share[\s\S]*from public\.coach_availability_slots[\s\S]*for update/i);
    expect(safetySql).toMatch(/delete_my_account[\s\S]*pg_advisory_xact_lock/i);
  });

  it("locks a slot before cancellation checks and rejects accepting cancelled inventory", () => {
    expect(safetySql).toMatch(/cancel_coach_availability_slot[\s\S]*from public\.coach_availability_slots[\s\S]*for update[\s\S]*from public\.coach_bookings/i);
    expect(safetySql).toMatch(/respond_to_coach_booking[\s\S]*target_slot\.state <> 'OPEN'/i);
  });

  it("enforces active-account suspension inside private RPCs", () => {
    expect(safetySql).toMatch(/add column account_status text not null default 'ACTIVE'/i);
    expect(safetySql).toMatch(/create or replace function public\.assert_active_member/i);
    for (const rpc of [
      "request_coach_booking", "create_coach_availability_slot", "cancel_coach_availability_slot",
      "respond_to_coach_booking", "cancel_coach_booking", "complete_coach_booking",
      "set_coach_booking_meeting_details", "list_my_coach_schedule", "list_my_coach_slots",
    ]) expect(safetySql).toMatch(new RegExp(`${rpc}[\\s\\S]*assert_active_member`, "i"));
    expect(safetySql).toMatch(/set_member_account_suspension[\s\S]*account_suspension_reason/i);
  });

  it("prevents cross-role overlap and records cancellation policy outcomes", () => {
    expect(safetySql).toMatch(/athlete_id in \(booking\.coach_user_id, booking\.athlete_user_id\)/i);
    expect(safetySql).toMatch(/owner_id in \(booking\.coach_user_id, booking\.athlete_user_id\)/i);
    expect(safetySql).toMatch(/refund_policy_outcome/i);
    expect(safetySql).toMatch(/FULL_REFUND_DUE[\s\S]*OUTSIDE_FULL_REFUND_WINDOW/i);
    expect(safetySql).toMatch(/cancel_coach_booking[\s\S]*slot\.ends_at > clock_timestamp\(\)/i);
  });

  it("keeps meeting details participant-only and blocks deletion with future active sessions", () => {
    expect(safetySql).toMatch(/meeting_details text/i);
    expect(safetySql).toMatch(/set_coach_booking_meeting_details/i);
    expect(safetySql).toMatch(/booking\.status in \('CONFIRMED', 'COMPLETED'\)/i);
    expect(safetySql).toMatch(/Resolve future active sessions before deleting your account/i);
    expect(safetySql).toMatch(/on delete cascade/i);
    expect(safetySql).toMatch(/revoke all on function public\.set_coach_booking_meeting_details/i);
    expect(safetySql).toMatch(/slot\.ends_at > clock_timestamp\(\)/i);
  });

  it("keeps submitted reviews immutable at the database boundary", () => {
    expect(reviewSql).toMatch(/create table public\.coach_reviews[\s\S]*booking_id uuid primary key/i);
    expect(reviewSql).toMatch(/submit_coach_review[\s\S]*for update[\s\S]*insert into public\.coach_reviews/i);
    expect(reviewSql).toMatch(/when unique_violation then raise exception 'This session has already been reviewed'/i);
    expect(reviewSql).not.toMatch(/update public\.coach_reviews|on conflict[\s\S]*do update/i);
  });

  it("timestamps demo payments and records eligible demo refunds atomically", () => {
    expect(refundSql).toMatch(/payment_recorded_at timestamptz/i);
    expect(refundSql).toMatch(/refunded_at timestamptz/i);
    expect(refundSql).toMatch(/payment_status in \('NOT_COLLECTED', 'DEMO_PAID', 'DEMO_REFUNDED'\)/i);
    expect(refundSql).toMatch(/record_demo_booking_payment[\s\S]*status not in \('CONFIRMED', 'COMPLETED'\)[\s\S]*payment_recorded_at = timezone\('utc', now\(\)\)/i);
    expect(refundSql).not.toMatch(/update public\.coach_bookings\s+set payment_recorded_at/i);
    expect(refundSql).not.toMatch(/refunded_at\s*=\s*coalesce\([^;]*(?:cancelled_at|updated_at)/i);
    expect(refundSql).toMatch(/set payment_status = 'DEMO_REFUNDED',[\s\S]*refunded_at = timezone\('utc', now\(\)\)/i);
    expect(refundSql).toMatch(/cancel_coach_booking[\s\S]*FULL_REFUND_DUE[\s\S]*payment_status = case[\s\S]*DEMO_REFUNDED[\s\S]*refunded_at = case/i);
    expect(refundSql).toMatch(/list_my_coach_schedule[\s\S]*payment_recorded_at[\s\S]*refunded_at/i);
  });
});
