"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function redeemInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Enter your invite code." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_invite", { p_token: token });
  if (error) return { error: error.message };
  redirect("/portal");
}
