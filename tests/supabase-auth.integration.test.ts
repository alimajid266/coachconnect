import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";

const apiUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runIntegration = apiUrl && publishableKey && serviceRoleKey ? describe : describe.skip;
const createdUserIds: string[] = [];

function publicClient(): SupabaseClient {
  return createClient(apiUrl!, publishableKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function serviceClient(): SupabaseClient {
  return createClient(apiUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

runIntegration("Supabase account and coach capability policies", () => {
  afterAll(async () => {
    const admin = serviceClient();
    await Promise.all(createdUserIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("creates safe account roles and isolates profiles with RLS", async () => {
    const athlete = publicClient();
    const athleteSignup = await athlete.auth.signUp({
      email: `athlete-${crypto.randomUUID()}@coachconnect.local`,
      password: `Cc-${crypto.randomUUID()}-9x`,
      options: { data: { display_name: "RLS Athlete", role: "ADMIN" } },
    });
    expect(athleteSignup.error).toBeNull();
    expect(athleteSignup.data.session).not.toBeNull();
    createdUserIds.push(athleteSignup.data.user!.id);

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
      .eq("id", athleteSignup.data.user!.id);
    expect(escalation.error).not.toBeNull();

    const coach = publicClient();
    const coachSignup = await coach.auth.signUp({
      email: `coach-${crypto.randomUUID()}@coachconnect.local`,
      password: `Cc-${crypto.randomUUID()}-9x`,
      options: { data: { display_name: "RLS Coach", role: "COACH" } },
    });
    expect(coachSignup.error).toBeNull();
    createdUserIds.push(coachSignup.data.user!.id);

    const coachProfile = await coach.from("profiles").select("role").single();
    expect(coachProfile.data?.role).toBe("ATHLETE");

    const crossAccountRead = await coach
      .from("profiles")
      .select("id")
      .eq("id", athleteSignup.data.user!.id);
    expect(crossAccountRead.error).toBeNull();
    expect(crossAccountRead.data).toEqual([]);
  });

  it("enforces the coach application and administrator review lifecycle", async () => {
    const password = `Cc-${crypto.randomUUID()}-9x`;
    const applicant = publicClient();
    const applicantSignup = await applicant.auth.signUp({
      email: `applicant-${crypto.randomUUID()}@coachconnect.local`,
      password,
      options: { data: { display_name: "Coach Applicant", role: "COACH" } },
    });
    expect(applicantSignup.error).toBeNull();
    const applicantId = applicantSignup.data.user!.id;
    createdUserIds.push(applicantId);

    const reviewer = publicClient();
    const reviewerSignup = await reviewer.auth.signUp({
      email: `reviewer-${crypto.randomUUID()}@coachconnect.local`,
      password,
      options: { data: { display_name: "Review Admin", role: "ADMIN" } },
    });
    expect(reviewerSignup.error).toBeNull();
    const reviewerId = reviewerSignup.data.user!.id;
    createdUserIds.push(reviewerId);

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

    const reviewerDraft = await reviewer.from("coach_applications").insert({ user_id: reviewerId });
    expect(reviewerDraft.error).toBeNull();
    const selfReview = await reviewer.rpc("review_coach_application", {
      target_user_id: reviewerId,
      decision: "UNDER_REVIEW",
      note: "Self review attempt",
    });
    expect(selfReview.error?.message).toContain("Self-review");
  });
});
