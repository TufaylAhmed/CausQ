"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UpdatePasswordPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthScene kicker="New password" title="Set a new password">
      <form
        action={async (fd) => {
          setError(null);
          const pw = String(fd.get("password") ?? "");
          if (pw.length < 8) return setError("Use at least 8 characters.");
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) setError(error.message);
          else window.location.href = "/portal";
        }}
        className="space-y-3"
      >
        <label className="meta block">New password</label>
        <Input
          name="password"
          type="password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          className="h-11"
        />
        <Button type="submit" className="h-11 w-full">
          Update password
        </Button>
        {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        <p className="meta pt-1">
          Open this page from the reset link in your email so you are signed in to
          change the password.
        </p>
      </form>
    </AuthScene>
  );
}
