"use server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestAccess(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  if (!name || !email) return { error: "Name and email are required." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("access_requests")
    .insert({ name, email, company, message });
  return error ? { error: error.message } : { ok: true };
}
