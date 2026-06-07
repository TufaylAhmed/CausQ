"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink } from "./actions";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function oauth(provider: "google" | "azure") {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <AuthScene
      kicker="Sign in"
      title="Welcome back"
      foot={
        <>
          No account?{" "}
          <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/request-access">
            Request access
          </a>
        </>
      }
    >
      {sent ? (
        <div className="panel p-5">
          <p className="kicker mb-2">Check your inbox</p>
          <p className="text-sm text-[var(--ink-mute)]">
            We sent a one-time sign-in link to your email. It expires shortly, so
            use it soon.
          </p>
        </div>
      ) : (
        <form
          action={async (fd) => {
            const r = await sendMagicLink(fd);
            if (r?.error) setError(r.error);
            else setSent(true);
          }}
          className="space-y-3"
        >
          <label className="meta block">Work email</label>
          <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
          <Button type="submit" className="h-11 w-full">
            Email me a sign-in link
          </Button>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        </form>
      )}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="meta">or continue with</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-11" onClick={() => oauth("google")}>
          Google
        </Button>
        <Button variant="outline" className="h-11" onClick={() => oauth("azure")}>
          Microsoft
        </Button>
      </div>
    </AuthScene>
  );
}
