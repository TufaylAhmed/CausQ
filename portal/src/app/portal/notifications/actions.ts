"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markRead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.rpc("mark_notification_read", { p_id: id });
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}

export async function markAllRead() {
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  revalidatePath("/portal/notifications");
  revalidatePath("/portal");
}
