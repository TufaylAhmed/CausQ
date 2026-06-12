"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types/database.types";

type TaskStatus = Database["public"]["Enums"]["milestone_status"];

async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

function paths(engagementId: string) {
  revalidatePath(`/portal/projects/${engagementId}/tasks`);
  revalidatePath(`/portal/projects/${engagementId}`);
}

export async function addTask(formData: FormData) {
  const engagement_id = String(formData.get("engagement_id"));
  const title = String(formData.get("title") || "").trim();
  const due_date = String(formData.get("due_date") || "") || null;
  if (!title) throw new Error("Title required.");
  const supabase = await staffClient();
  const { error } = await supabase.from("tasks").insert({ engagement_id, title, due_date });
  if (error) throw new Error(error.message);
  paths(engagement_id);
}

export async function setTaskStatus(formData: FormData) {
  const id = String(formData.get("id"));
  const engagement_id = String(formData.get("engagement_id"));
  const status = String(formData.get("status")) as TaskStatus;
  const supabase = await staffClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  paths(engagement_id);
}

export async function deleteTask(formData: FormData) {
  const id = String(formData.get("id"));
  const engagement_id = String(formData.get("engagement_id"));
  const supabase = await staffClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  paths(engagement_id);
}
