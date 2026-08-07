import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { publicSlot } from "@/lib/scheduling";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!uuid.test(id)) return NextResponse.json({ slots: [] });
  try {
    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { data, error } = await supabase.rpc("list_public_coach_slots", { target_coach_id: id });
    if (error) return applyCookies(NextResponse.json({ error: "Schedule is temporarily unavailable." }, { status: 503 }));
    const slots = Array.isArray(data) ? data.flatMap((row) => {
      const value = publicSlot(row as Record<string, unknown>);
      return value ? [value] : [];
    }) : [];
    return applyCookies(NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } }));
  } catch {
    return NextResponse.json({ error: "Schedule is temporarily unavailable." }, { status: 503 });
  }
}
