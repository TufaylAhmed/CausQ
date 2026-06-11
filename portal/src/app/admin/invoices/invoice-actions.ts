"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/types/database.types";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

async function staffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return supabase;
}

// Uploads a PDF to the org-scoped documents path and records pdf_path.
export async function uploadInvoicePdf(formData: FormData) {
  const invoiceId = String(formData.get("invoice_id"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a PDF file.");

  const supabase = await staffClient();
  const { data: inv, error: e1 } = await supabase
    .from("invoices")
    .select("org_id")
    .eq("id", invoiceId)
    .single();
  if (e1 || !inv) throw new Error("Invoice not found.");

  const path = `${inv.org_id}/invoices/${invoiceId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: e2 } = await supabase.from("invoices").update({ pdf_path: path }).eq("id", invoiceId);
  if (e2) throw new Error(e2.message);

  await supabase.rpc("log_admin_action", {
    p_action: "upload_invoice_pdf",
    p_target: invoiceId,
    p_detail: {},
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/invoices");
}

export async function addLineItem(formData: FormData) {
  const invoice_id = String(formData.get("invoice_id"));
  const description = String(formData.get("description") || "").trim();
  const quantity = Number(formData.get("quantity") || 1);
  const unit_amount = Number(formData.get("unit_amount") || 0);
  if (!description) throw new Error("Description required.");

  const supabase = await staffClient();
  const { error } = await supabase
    .from("invoice_line_items")
    .insert({ invoice_id, description, quantity, unit_amount });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${invoice_id}`);
}

export async function deleteLineItem(formData: FormData) {
  const id = String(formData.get("id"));
  const invoice_id = String(formData.get("invoice_id"));
  const supabase = await staffClient();
  const { error } = await supabase.from("invoice_line_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/invoices/${invoice_id}`);
}

// Updates invoice status. Setting "paid" stamps paid_at; "sent"/"overdue" fire
// the notification trigger that alerts the org's clients.
export async function updateInvoiceStatus(formData: FormData) {
  const invoice_id = String(formData.get("invoice_id"));
  const status = String(formData.get("status")) as InvoiceStatus;

  const supabase = await staffClient();
  const patch: { status: InvoiceStatus; paid_at?: string | null } = { status };
  if (status === "paid") patch.paid_at = new Date().toISOString();

  const { error } = await supabase.from("invoices").update(patch).eq("id", invoice_id);
  if (error) throw new Error(error.message);

  await supabase.rpc("log_admin_action", {
    p_action: "update_invoice_status",
    p_target: invoice_id,
    p_detail: { status },
  });
  revalidatePath(`/admin/invoices/${invoice_id}`);
  revalidatePath("/admin/invoices");
}
