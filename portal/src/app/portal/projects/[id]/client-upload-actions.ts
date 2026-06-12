"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

// Client (or staff) uploads a file under the org-scoped client-uploads area and
// records it. The storage insert policy + record_client_document RPC enforce
// that the path stays within the caller's org and engagement.
export async function uploadClientFile(engagementId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > MAX_BYTES) return { error: "File too large (max 10 MB)." };
  if (file.type && !ALLOWED.has(file.type)) return { error: "Unsupported file type." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: eng } = await supabase
    .from("engagements")
    .select("org_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (!eng) return { error: "Project not found." };

  const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
  const path = `${eng.org_id}/projects/${engagementId}/client-uploads/${Date.now()}-${safe}`;
  const up = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type || undefined });
  if (up.error) return { error: up.error.message };

  const { error } = await supabase.rpc("record_client_document", {
    p_engagement: engagementId,
    p_filename: file.name,
    p_path: path,
    p_size: file.size,
  });
  if (error) return { error: error.message };

  revalidatePath(`/portal/projects/${engagementId}`);
  return { ok: true };
}
