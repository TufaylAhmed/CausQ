"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadDocument(engagementId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (
    !profile ||
    profile.status !== "active" ||
    !["staff", "admin"].includes(profile.role)
  ) {
    return { error: "Staff only." };
  }

  const { data: engagement } = await supabase
    .from("engagements")
    .select("org_id")
    .eq("id", engagementId)
    .single();
  if (!engagement) return { error: "Engagement not found." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file." };

  const path = `${engagement.org_id}/${Date.now()}-${file.name}`;
  const up = await supabase.storage.from("documents").upload(path, file);
  if (up.error) return { error: up.error.message };

  const ins = await supabase.from("documents").insert({
    org_id: engagement.org_id,
    engagement_id: engagementId,
    filename: file.name,
    storage_path: path,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (ins.error) return { error: ins.error.message };

  revalidatePath(`/portal/projects/${engagementId}`);
  return { ok: true };
}
