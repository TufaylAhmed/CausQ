"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetRequestPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthScene
      kicker="Reset password"
      title="Forgot your password?"
      foot={
        <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/login">
          Back to sign in
        </a>
      }
    >
      {sent ? (
        <div className="panel p-5">
          <p className="kicker mb-2">Check your inbox</p>
          <p className="text-sm text-[var(--ink-mute)]">
            If an account exists for that email, we sent a link to set a new
            password. It expires shortly, so use it soon.
          </p>
        </div>
      ) : (
        <form
          action={async (fd) => {
            setError(null);
            const email = String(fd.get("email") ?? "").trim();
            if (!email) return setError("Enter your email.");
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${location.origin}/auth/callback?next=/portal/reset/update`,
            });
            if (error) setError(error.message);
            else setSent(true);
          }}
          className="space-y-3"
        >
          <label className="meta block">Work email</label>
          <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
          <Button type="submit" className="h-11 w-full">
            Email me a reset link
          </Button>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        </form>
      )}
    </AuthScene>
  );
}
