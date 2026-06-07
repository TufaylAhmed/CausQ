import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("engagements").select("id");
  return NextResponse.json({ ok: !error, count: data?.length ?? 0 });
}
