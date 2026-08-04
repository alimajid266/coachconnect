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

runIntegration("Supabase account profile policies", () => {
  afterAll(async () => {
    const admin = createClient(apiUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
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
    expect(coachProfile.data?.role).toBe("COACH");

    const crossAccountRead = await coach
      .from("profiles")
      .select("id")
      .eq("id", athleteSignup.data.user!.id);
    expect(crossAccountRead.error).toBeNull();
    expect(crossAccountRead.data).toEqual([]);
  });
});
