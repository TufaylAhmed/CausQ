"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function sendMessage(engagementId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.rpc("post_message", {
    p_engagement: engagementId,
    p_body: body,
  });
  if (error) return { error: error.message };

  // Best-effort notify the engagement lead (admin client to look up the lead).
  try {
    const admin = createAdminClient();
    const { data: eng } = await admin
      .from("engagements")
      .select("title, lead_id")
      .eq("id", engagementId)
      .single();
    if (eng?.lead_id) {
      const { data: lead } = await admin
        .from("profiles")
        .select("email")
        .eq("id", eng.lead_id)
        .single();
      if (lead?.email) {
        await sendEmail({
          to: lead.email,
          subject: `New message on ${eng.title}`,
          text: `A client posted a new message on the engagement "${eng.title}". Open the CausQ portal to reply.`,
        });
      }
    }
  } catch {
    // notification is best-effort; never block the message
  }

  revalidatePath(`/portal/engagements/${engagementId}`);
  return { ok: true };
}
