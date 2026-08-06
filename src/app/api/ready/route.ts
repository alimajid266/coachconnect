import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.SUPABASE_INTERNAL_URL ?? process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return Response.json({ service: "coachconnect", status: "unavailable" }, { status: 503 });
  }

  try {
    const supabase = createClient(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await supabase.rpc("list_public_coaches");
    if (error) throw error;
    return Response.json({ service: "coachconnect", status: "ready" });
  } catch {
    return Response.json({ service: "coachconnect", status: "unavailable" }, { status: 503 });
  }
}
