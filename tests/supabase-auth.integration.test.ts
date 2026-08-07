import { afterAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnvironment } from "dotenv";

// Local integration tests must use one matching Supabase URL/key set. Override
// inherited shell values with the ignored project-local development file when
// it exists; hosted CI continues to use its injected environment variables.
loadEnvironment({ path: ".env.local", override: true, quiet: true });

const apiUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = apiUrl && publishableKey && serviceRoleKey ? describe : describe.skip;
const createdUserIds: string[] = [];

function publicClient(): SupabaseClient {
  return createClient(apiUrl!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `cc-public-${crypto.randomUUID()}` },
  });
}

function serviceClient(): SupabaseClient {
  return createClient(apiUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false, storageKey: `cc-public-${crypto.randomUUID()}` },
  });
}

async function createAuthenticatedMember(displayName: string, requestedRole = "ATHLETE") {
  const email = `test-${crypto.randomUUID()}@example.com`;
  const password = `Cc-${crypto.randomUUID()}-9x`;
  const admin = serviceClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, role: requestedRole },
  });
  expect(created.error).toBeNull();
  const userId = created.data.user!.id;
  createdUserIds.push(userId);

  const client = publicClient();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  expect(signedIn.error).toBeNull();
  expect(signedIn.data.session).not.toBeNull();
  return { client, userId, password };
}

runIntegration("Supabase account and coach capability policies", () => {
  afterAll(async () => {
    const admin = serviceClient();
    await Promise.all(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("creates safe account roles and isolates profiles with RLS", async () => {
    const athleteAccount = await createAuthenticatedMember("RLS Athlete", "ADMIN");
    const athlete = athleteAccount.client;
    const athleteId = athleteAccount.userId;

    const ownProfile = await athlete
      .from("profiles")
      .select("id, display_name, role")
      .single();
    expect(ownProfile.error).toBeNull();
    expect(ownProfile.data).toMatchObject({
      display_name: "RLS Athlete",
      role: "ATHLETE",
    });

    const escalation = await athlete
      .from("profiles")
      .update({ role: "ADMIN" })
      .eq("id", athleteId);
    expect(escalation.error).not.toBeNull();

    const coachAccount = await createAuthenticatedMember("RLS Coach", "COACH");
    const coach = coachAccount.client;

    const coachProfile = await coach.from("profiles").select("role").single();
    expect(coachProfile.data?.role).toBe("ATHLETE");

    const crossAccountRead = await coach
      .from("profiles")
      .select("id")
      .eq("id", athleteId);
    expect(crossAccountRead.error).toBeNull();
    expect(crossAccountRead.data).toEqual([]);
  });

  it("enforces the coach application and administrator review lifecycle", async () => {
    const applicantAccount = await createAuthenticatedMember("Coach Applicant", "COACH");
    const applicant = applicantAccount.client;
    const applicantId = applicantAccount.userId;

    const reviewerAccount = await createAuthenticatedMember("Review Admin", "ADMIN");
    const reviewer = reviewerAccount.client;
    const reviewerId = reviewerAccount.userId;

    const promote = await serviceClient().from("profiles").update({ role: "ADMIN" }).eq("id", reviewerId);
    expect(promote.error).toBeNull();

    const saved = await applicant.from("coach_applications").upsert({
      user_id: applicantId,
      headline: "Patient tennis coach for confident match play",
      bio: "I help teenagers and adults build dependable technique, movement and match confidence through structured sessions that adapt to individual goals.",
      sports: ["Tennis"],
      experience_years: 8,
      qualifications: "Pakistan Tennis Federation coaching certification",
      audiences: ["Teenagers", "Adults"],
      levels: ["Beginner", "Intermediate"],
      lesson_plan: "We begin with a movement warm-up, assess one priority, practise focused drills, apply the skill in match play and finish with a development plan.",
      session_price_pkr: 4500,
      offers_online: false,
      offers_in_person: true,
      city: "Lahore",
      public_area: "Gulberg",
      availability: [],
      faqs: [],
    });
    expect(saved.error).toBeNull();

    const selfApproval = await applicant
      .from("coach_applications")
      .update({ status: "APPROVED" })
      .eq("user_id", applicantId);
    expect(selfApproval.error).not.toBeNull();

    const submitted = await applicant.rpc("submit_coach_application");
    expect(submitted.error).toBeNull();
    expect(submitted.data?.status).toBe("SUBMITTED");

    const unauthorizedReview = await applicant.rpc("review_coach_application", {
      target_user_id: applicantId,
      decision: "APPROVED",
      note: "Self approval attempt",
    });
    expect(unauthorizedReview.error).not.toBeNull();

    const queue = await reviewer.from("coach_applications").select("user_id,status");
    expect(queue.error).toBeNull();
    expect(queue.data).toContainEqual({ user_id: applicantId, status: "SUBMITTED" });

    const approved = await reviewer.rpc("review_coach_application", {
      target_user_id: applicantId,
      decision: "APPROVED",
      note: "Profile and qualifications checked.",
    });
    expect(approved.error).toBeNull();
    expect(approved.data?.status).toBe("APPROVED");

    const approvedEdit = await applicant
      .from("coach_applications")
      .update({ headline: "Updated tennis coaching for confident match play" })
      .eq("user_id", applicantId);
    expect(approvedEdit.error).toBeNull();
    const liveRevision = await reviewer
      .from("coach_applications")
      .select("status")
      .eq("user_id", applicantId)
      .single();
    expect(liveRevision.data?.status).toBe("APPROVED");

    const reviewerDraft = await reviewer.from("coach_applications").insert({ user_id: reviewerId });
    expect(reviewerDraft.error).toBeNull();
    const selfReview = await reviewer.rpc("review_coach_application", {
      target_user_id: reviewerId,
      decision: "UNDER_REVIEW",
      note: "Self review attempt",
    });
    expect(selfReview.error?.message).toContain("Self-review");
  });

  it("prevents booking conflicts and enforces the request, acceptance, and cancellation lifecycle", async () => {
    const coachAccount = await createAuthenticatedMember("Schedule Coach");
    const athleteOne = await createAuthenticatedMember("Schedule Athlete One");
    const athleteTwo = await createAuthenticatedMember("Schedule Athlete Two");
    const reviewerAccount = await createAuthenticatedMember("Schedule Reviewer");
    const admin = serviceClient();
    expect((await admin.from("profiles").update({ role: "ADMIN" }).eq("id", reviewerAccount.userId)).error).toBeNull();

    const draft = await coachAccount.client.from("coach_applications").insert({
      user_id: coachAccount.userId,
      headline: "Structured online tennis coaching",
      bio: "I help adults build consistent technique through clear online sessions, focused practice tasks, and practical feedback adapted to their current level.",
      sports: ["Tennis"], experience_years: 5,
      qualifications: "Community tennis coaching certificate",
      audiences: ["Adults"], levels: ["Beginner"],
      lesson_plan: "We review goals, warm up safely, practise one focused skill, apply it, and finish with a clear plan.",
      session_price_pkr: 3000, offers_online: true, offers_in_person: false,
    });
    expect(draft.error).toBeNull();
    expect((await coachAccount.client.rpc("submit_coach_application")).error).toBeNull();
    expect((await reviewerAccount.client.rpc("review_coach_application", {
      target_user_id: coachAccount.userId, decision: "APPROVED", note: "Initial coach capability approved.",
    })).error).toBeNull();

    const start = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const createdSlot = await coachAccount.client.rpc("create_coach_availability_slot", {
      requested_start: start.toISOString(), requested_end: end.toISOString(), requested_mode: "ONLINE",
    });
    expect(createdSlot.error).toBeNull();
    const slotId = createdSlot.data?.id as string;
    expect(slotId).toBeTruthy();

    const attempts = await Promise.all([
      athleteOne.client.rpc("request_coach_booking", { target_slot_id: slotId, requested_note: "First request" }),
      athleteTwo.client.rpc("request_coach_booking", { target_slot_id: slotId, requested_note: "Concurrent request" }),
    ]);
    expect(attempts.filter((attempt) => attempt.error === null)).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.error !== null)).toHaveLength(1);
    const winner = attempts[0].error === null ? athleteOne : athleteTwo;
    const bookingId = attempts.find((attempt) => attempt.error === null)?.data?.id as string;

    const coachSchedule = await coachAccount.client.rpc("list_my_coach_schedule");
    expect(coachSchedule.error).toBeNull();
    expect(coachSchedule.data).toContainEqual(expect.objectContaining({ booking_id: bookingId, status: "REQUESTED" }));
    const accepted = await coachAccount.client.rpc("respond_to_coach_booking", { target_booking_id: bookingId, accept_booking: true });
    expect(accepted.error).toBeNull();
    expect(accepted.data?.status).toBe("CONFIRMED");

    const athleteSchedule = await winner.client.rpc("list_my_coach_schedule");
    expect(athleteSchedule.data).toContainEqual(expect.objectContaining({ booking_id: bookingId, status: "CONFIRMED", meeting_details: null }));

    const athleteDetailsAttempt = await winner.client.rpc("set_coach_booking_meeting_details", {
      target_booking_id: bookingId,
      requested_details: "Athletes cannot set this value.",
    });
    expect(athleteDetailsAttempt.error).not.toBeNull();
    const meetingDetails = "Private video link: https://meet.example/session-123";
    const savedDetails = await coachAccount.client.rpc("set_coach_booking_meeting_details", {
      target_booking_id: bookingId,
      requested_details: meetingDetails,
    });
    expect(savedDetails.error).toBeNull();
    expect(savedDetails.data?.meeting_details).toBe(meetingDetails);
    const participantSchedule = await winner.client.rpc("list_my_coach_schedule");
    expect(participantSchedule.data).toContainEqual(expect.objectContaining({ booking_id: bookingId, meeting_details: meetingDetails }));
    const unrelatedSchedule = await (winner.userId === athleteOne.userId ? athleteTwo : athleteOne).client.rpc("list_my_coach_schedule");
    expect(unrelatedSchedule.data).not.toContainEqual(expect.objectContaining({ booking_id: bookingId }));

    const blockedDeletion = await winner.client.rpc("begin_my_account_deletion");
    expect(blockedDeletion.error?.message).toMatch(/booking history must be retained/i);

    const cancelled = await winner.client.rpc("cancel_coach_booking", { target_booking_id: bookingId, requested_reason: "Plans changed" });
    expect(cancelled.error).toBeNull();
    expect(cancelled.data?.status).toBe("CANCELLED_BY_ATHLETE");
    expect(cancelled.data?.payment_status).toBe("NOT_COLLECTED");

    const directRead = await winner.client.from("coach_bookings").select("id");
    expect(directRead.error).not.toBeNull();

    const secondStart = new Date(Date.now() + 96 * 60 * 60 * 1000);
    const secondEnd = new Date(secondStart.getTime() + 60 * 60 * 1000);
    const secondSlot = await coachAccount.client.rpc("create_coach_availability_slot", {
      requested_start: secondStart.toISOString(), requested_end: secondEnd.toISOString(), requested_mode: "ONLINE",
    });
    expect(secondSlot.error).toBeNull();
    const secondRequest = await athleteOne.client.rpc("request_coach_booking", {
      target_slot_id: secondSlot.data?.id, requested_note: "Request before suspension",
    });
    expect(secondRequest.error).toBeNull();
    expect((await reviewerAccount.client.rpc("review_coach_application", {
      target_user_id: coachAccount.userId, decision: "SUSPENDED", note: "Temporary safety suspension.",
    })).error).toBeNull();
    const acceptanceAfterSuspension = await coachAccount.client.rpc("respond_to_coach_booking", {
      target_booking_id: secondRequest.data?.id, accept_booking: true,
    });
    expect(acceptanceAfterSuspension.error).not.toBeNull();
    const safeDecline = await coachAccount.client.rpc("respond_to_coach_booking", {
      target_booking_id: secondRequest.data?.id, accept_booking: false,
    });
    expect(safeDecline.error).toBeNull();
    expect(safeDecline.data?.status).toBe("DECLINED");

    expect((await reviewerAccount.client.rpc("review_coach_application", {
      target_user_id: coachAccount.userId, decision: "APPROVED", note: "Coach capability restored.",
    })).error).toBeNull();
    const suspendedAccount = await reviewerAccount.client.rpc("set_member_account_suspension", {
      target_user_id: coachAccount.userId, suspend_account: true, requested_reason: "Account-level safety review.",
    });
    expect(suspendedAccount.error).toBeNull();
    expect(suspendedAccount.data?.account_status).toBe("SUSPENDED");
    expect((await coachAccount.client.rpc("list_my_coach_schedule")).error?.message).toMatch(/active account/i);
    expect((await coachAccount.client.from("profiles").select("display_name").eq("id", coachAccount.userId)).data).toEqual([]);
    expect((await coachAccount.client.from("coach_applications").select("status").eq("user_id", coachAccount.userId)).data).toEqual([]);
    expect((await coachAccount.client.rpc("submit_coach_application")).error).not.toBeNull();
    const hiddenWhileSuspended = await publicClient().rpc("get_public_coach", { target_user_id: coachAccount.userId });
    expect(hiddenWhileSuspended.data).toEqual([]);
    const restoredAccount = await reviewerAccount.client.rpc("set_member_account_suspension", {
      target_user_id: coachAccount.userId, suspend_account: false, requested_reason: null,
    });
    expect(restoredAccount.error).toBeNull();
    expect(restoredAccount.data?.account_status).toBe("ACTIVE");

    const overlapStart = new Date(Date.now() + 120 * 60 * 60 * 1000);
    const overlapEnd = new Date(overlapStart.getTime() + 60 * 60 * 1000);
    const targetOverlapSlot = await coachAccount.client.rpc("create_coach_availability_slot", {
      requested_start: overlapStart.toISOString(), requested_end: overlapEnd.toISOString(), requested_mode: "ONLINE",
    });
    expect(targetOverlapSlot.error).toBeNull();
    expect((await athleteOne.client.from("coach_applications").insert({
      user_id: athleteOne.userId,
      headline: "Safe online coaching", bio: "A sufficiently detailed biography for an approved dual-role test coach account and schedule.",
      sports: ["Tennis"], experience_years: 3, qualifications: "Test coaching qualification",
      audiences: ["Adults"], levels: ["Beginner"],
      lesson_plan: "Warm up, practise one skill, apply feedback, cool down and review the next safe step.",
      session_price_pkr: 2500, offers_online: true, offers_in_person: false,
    })).error).toBeNull();
    expect((await athleteOne.client.rpc("submit_coach_application")).error).toBeNull();
    expect((await reviewerAccount.client.rpc("review_coach_application", {
      target_user_id: athleteOne.userId, decision: "APPROVED", note: "Dual-role schedule test approval.",
    })).error).toBeNull();
    const ownOverlapSlot = await athleteOne.client.rpc("create_coach_availability_slot", {
      requested_start: overlapStart.toISOString(), requested_end: overlapEnd.toISOString(), requested_mode: "ONLINE",
    });
    expect(ownOverlapSlot.error).toBeNull();
    const crossRoleConflict = await athleteOne.client.rpc("request_coach_booking", {
      target_slot_id: targetOverlapSlot.data?.id, requested_note: "Must conflict with my coach availability",
    });
    expect(crossRoleConflict.error?.message).toMatch(/overlaps availability/i);

    const raceStart = new Date(Date.now() + 144 * 60 * 60 * 1000);
    const raceEnd = new Date(raceStart.getTime() + 60 * 60 * 1000);
    const raceSlot = await coachAccount.client.rpc("create_coach_availability_slot", {
      requested_start: raceStart.toISOString(), requested_end: raceEnd.toISOString(), requested_mode: "ONLINE",
    });
    const requestVersusDelete = await Promise.all([
      athleteTwo.client.rpc("request_coach_booking", { target_slot_id: raceSlot.data?.id, requested_note: "Racing slot deletion" }),
      coachAccount.client.rpc("cancel_coach_availability_slot", { target_slot_id: raceSlot.data?.id }),
    ]);
    expect(requestVersusDelete.filter((result) => result.error === null)).toHaveLength(1);

    const disposableAthlete = await createAuthenticatedMember("Disposable Race Athlete");
    const deletionRaceStart = new Date(Date.now() + 168 * 60 * 60 * 1000);
    const deletionRaceEnd = new Date(deletionRaceStart.getTime() + 60 * 60 * 1000);
    const deletionRaceSlot = await coachAccount.client.rpc("create_coach_availability_slot", {
      requested_start: deletionRaceStart.toISOString(), requested_end: deletionRaceEnd.toISOString(), requested_mode: "ONLINE",
    });
    const bookingVersusAccountDeletion = await Promise.all([
      disposableAthlete.client.rpc("request_coach_booking", { target_slot_id: deletionRaceSlot.data?.id, requested_note: "Racing account deletion" }),
      disposableAthlete.client.rpc("delete_my_account"),
    ]);
    expect(bookingVersusAccountDeletion.filter((result) => result.error === null)).toHaveLength(1);
    expect(bookingVersusAccountDeletion.filter((result) => result.error !== null)).toHaveLength(1);
  });

  it("permanently deletes only the authenticated member and cascades private profile data", async () => {
    const memberAccount = await createAuthenticatedMember("Delete Me");
    const member = memberAccount.client;
    const memberId = memberAccount.userId;

    const application = await member.from("coach_applications").insert({ user_id: memberId });
    expect(application.error).toBeNull();

    const anonymousDeletion = await publicClient().rpc("begin_my_account_deletion");
    expect(anonymousDeletion.error).not.toBeNull();

    expect((await member.rpc("begin_my_account_deletion")).error).toBeNull();
    const deletion = await member.rpc("delete_my_account");
    expect(deletion.error).toBeNull();
    expect(deletion.data).toBe(true);

    const admin = serviceClient();
    const deletedIdentity = await admin.auth.admin.getUserById(memberId);
    expect(deletedIdentity.error).not.toBeNull();
    const deletedProfile = await admin.from("profiles").select("id").eq("id", memberId);
    expect(deletedProfile.data).toEqual([]);
    const deletedApplication = await admin.from("coach_applications").select("user_id").eq("user_id", memberId);
    expect(deletedApplication.data).toEqual([]);
  });

  it("lets an administrator delete their account after reviewing an application", async () => {
    const applicantAccount = await createAuthenticatedMember("Reviewed Applicant");
    const applicant = applicantAccount.client;
    const applicantId = applicantAccount.userId;

    const reviewerAccount = await createAuthenticatedMember("Deleting Reviewer");
    const reviewer = reviewerAccount.client;
    const reviewerId = reviewerAccount.userId;

    const admin = serviceClient();
    const promote = await admin.from("profiles").update({ role: "ADMIN" }).eq("id", reviewerId);
    expect(promote.error).toBeNull();

    const draft = await applicant.from("coach_applications").insert({
      user_id: applicantId,
      headline: "Patient cricket coaching for confident match play",
      bio: "I help developing players build dependable technique, movement and match confidence through structured sessions that adapt to individual goals.",
      sports: ["Cricket"],
      experience_years: 7,
      qualifications: "Certified community cricket coach",
      audiences: ["Adults"],
      levels: ["Beginner"],
      lesson_plan: "Each session combines a safe warm-up, focused drills, guided practice, clear feedback and a practical development plan.",
      session_price_pkr: 4000,
      offers_online: true,
      offers_in_person: false,
    });
    expect(draft.error).toBeNull();
    expect((await applicant.rpc("submit_coach_application")).error).toBeNull();
    expect((await reviewer.rpc("review_coach_application", {
      target_user_id: applicantId,
      decision: "APPROVED",
      note: "Application reviewed before account deletion.",
    })).error).toBeNull();

    expect((await reviewer.rpc("begin_my_account_deletion")).error).toBeNull();
    const deletion = await reviewer.rpc("delete_my_account");
    expect(deletion.error).toBeNull();
    expect(deletion.data).toBe(true);

    const reviewedApplication = await admin
      .from("coach_applications")
      .select("reviewed_by,status")
      .eq("user_id", applicantId)
      .single();
    expect(reviewedApplication.error).toBeNull();
    expect(reviewedApplication.data).toEqual({ reviewed_by: null, status: "APPROVED" });
  });
});
