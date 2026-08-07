import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Coach } from "@/lib/coaches";
import { attachSignedCoachMedia, publicCoach } from "@/lib/public-coaches";

export async function GET() {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
  }

  const supabase = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [approvedResult, demoResult] = await Promise.all([
    supabase.rpc("list_public_coaches"),
    supabase.rpc("list_demo_coaches"),
  ]);
  if (approvedResult.error || !Array.isArray(approvedResult.data)) {
    return NextResponse.json({ error: "Approved coaches are temporarily unavailable." }, { status: 503 });
  }

  const approvedRows = await Promise.all(approvedResult.data.map(async (row, index) => {
    const record = row as Record<string, unknown>;
    const coach = publicCoach(record, 1000 + index);
    return coach ? attachSignedCoachMedia(supabase, coach, record) : null;
  }));
  const coaches = approvedRows.filter((coach): coach is Coach => coach !== null);
  const demosAvailable = !demoResult.error && Array.isArray(demoResult.data);
  const demoRows: unknown[] = demosAvailable ? demoResult.data as unknown[] : [];
  const demos = demoRows.flatMap((row, index) => {
    const coach = publicCoach({ ...(row as Record<string, unknown>), is_demo: true }, 2000 + index);
    return coach ? [coach] : [];
  });
  const response = NextResponse.json({ coaches, demos, demosAvailable });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
