"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Stage = Database["public"]["Enums"]["opportunity_stage"];
type DB = SupabaseClient<Database>;

async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

async function logActivity(
  supabase: DB,
  org_id: string,
  kind: string,
  summary: string,
  actor_id: string,
  ref?: string
) {
  await supabase.from("activity_log").insert({ org_id, kind, summary, actor_id, ref: ref ?? null });
}

export async function addOpportunity(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const title = String(formData.get("title") || "").trim();
  const value = Number(formData.get("value") || 0);
  const expected_close = String(formData.get("expected_close") || "") || null;
  if (!title) throw new Error("Title required.");
  const { supabase, user } = await staffClient();
  const { data, error } = await supabase
    .from("opportunities")
    .insert({ org_id, title, value, expected_close })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logActivity(supabase, org_id, "opportunity", `Opportunity created: ${title}`, user.id, data?.id);
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${org_id}`);
}

export async function setOpportunityStage(formData: FormData) {
  const id = String(formData.get("id"));
  const org_id = String(formData.get("org_id"));
  const title = String(formData.get("title") || "");
  const stage = String(formData.get("stage")) as Stage;
  const { supabase, user } = await staffClient();
  const { error } = await supabase.from("opportunities").update({ stage }).eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity(supabase, org_id, "stage_change", `${title || "Opportunity"} moved to ${stage}`, user.id, id);
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${org_id}`);
}

export async function deleteOpportunity(formData: FormData) {
  const id = String(formData.get("id"));
  const org_id = String(formData.get("org_id"));
  const { supabase } = await staffClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/crm/${org_id}`);
}

export async function addContact(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim() || null;
  const role = String(formData.get("role") || "").trim() || null;
  const is_causq_staff = formData.get("is_causq_staff") === "on";
  if (!name) throw new Error("Name required.");
  const { supabase, user } = await staffClient();
  const { error } = await supabase.from("contacts").insert({ org_id, name, email, role, is_causq_staff });
  if (error) throw new Error(error.message);
  await logActivity(supabase, org_id, "contact", `Contact added: ${name}`, user.id);
  revalidatePath("/admin/crm/contacts");
  revalidatePath(`/admin/crm/${org_id}`);
}

export async function deleteContact(formData: FormData) {
  const id = String(formData.get("id"));
  const org_id = String(formData.get("org_id"));
  const { supabase } = await staffClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/crm/contacts");
  revalidatePath(`/admin/crm/${org_id}`);
}

export async function addNote(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const summary = String(formData.get("summary") || "").trim();
  if (!summary) throw new Error("Write a note.");
  const { supabase, user } = await staffClient();
  await logActivity(supabase, org_id, "note", summary, user.id);
  revalidatePath(`/admin/crm/${org_id}`);
}
