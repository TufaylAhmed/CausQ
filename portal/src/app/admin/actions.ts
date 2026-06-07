"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function approveUser(formData: FormData) {
  const id = String(formData.get("id"));
  const org = String(formData.get("org_id") || "") || undefined;
  const { supabase } = await staffClient();
  const { error } = await supabase.rpc("approve_profile", { p_id: id, p_org: org });
  if (error) throw new Error(error.message);
  await supabase.rpc("log_admin_action", { p_action: "approve_profile", p_target: id, p_detail: {} });
  revalidatePath("/admin");
}

export async function rejectUser(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await staffClient();
  const { error } = await supabase.rpc("reject_profile", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createOrg(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const domains = String(formData.get("domains") || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (!name) throw new Error("Name required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("orgs").insert({ name, verified_domains: domains });
  if (error) throw new Error(error.message);
  await supabase.rpc("log_admin_action", { p_action: "create_org", p_target: name, p_detail: {} });
  revalidatePath("/admin/orgs");
}

export async function updateOrgDomains(formData: FormData) {
  const id = String(formData.get("id"));
  const domains = String(formData.get("domains") || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const { supabase } = await staffClient();
  const { error } = await supabase.from("orgs").update({ verified_domains: domains }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/orgs");
}

export async function createEngagement(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const title = String(formData.get("title") || "").trim();
  const summary = String(formData.get("summary") || "").trim() || null;
  if (!title) throw new Error("Title required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("engagements").insert({ org_id, title, summary });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/engagements");
}

export async function addMilestone(formData: FormData) {
  const engagement_id = String(formData.get("engagement_id"));
  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Title required.");
  const { supabase } = await staffClient();
  const { error } = await supabase.from("milestones").insert({ engagement_id, title });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/engagements");
}

export async function createInvoice(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const number = String(formData.get("number") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const due_date = String(formData.get("due_date") || "") || null;
  if (!number) throw new Error("Invoice number required.");
  const { supabase } = await staffClient();
  const { error } = await supabase
    .from("invoices")
    .insert({ org_id, number, amount, due_date, status: "sent" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invoices");
}

export async function createInviteAction(formData: FormData) {
  const org_id = String(formData.get("org_id"));
  const email = String(formData.get("email") || "").trim() || undefined;
  const { supabase } = await staffClient();
  const { data, error } = await supabase.rpc("create_invite", {
    p_org: org_id,
    p_email: email,
    p_days: 14,
  });
  if (error) return { error: error.message };
  return { token: data as string };
}
