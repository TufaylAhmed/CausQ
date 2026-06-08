"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink, signInPassword } from "./actions";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function oauth(provider: "google" | "linkedin_oidc") {
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
          <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/signup">
            Create one
          </a>
          <span className="px-2 text-[var(--line-strong)]">/</span>
          <a className="text-[var(--ink-mute)] underline underline-offset-4" href="/portal/request-access">
            Request access
          </a>
        </>
      }
    >
      {mode === "password" && (
        <form
          action={async (fd) => {
            setError(null);
            const r = await signInPassword(fd);
            if (r?.error) setError(r.error);
          }}
          className="space-y-3"
        >
          <div>
            <label className="meta block pb-1">Work email</label>
            <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">Password</label>
            <Input name="password" type="password" placeholder="Your password" required className="h-11" />
          </div>
          <Button type="submit" className="h-11 w-full">
            Sign in
          </Button>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { setMode("magic"); setError(null); }}
              className="meta underline underline-offset-4 hover:text-[var(--signal-deep)]"
            >
              Email me a one-time link instead
            </button>
            <a className="meta underline underline-offset-4 hover:text-[var(--signal-deep)]" href="/portal/reset">
              Forgot password?
            </a>
          </div>
        </form>
      )}

      {mode === "magic" && (
        sent ? (
          <div className="panel p-5">
            <p className="kicker mb-2">Check your inbox</p>
            <p className="text-sm text-[var(--ink-mute)]">
              We sent a one-time sign-in link to your email. Use it soon, it expires shortly.
            </p>
          </div>
        ) : (
          <form
            action={async (fd) => {
              setError(null);
              const r = await sendMagicLink(fd);
              if (r?.error) setError(r.error);
              else setSent(true);
            }}
            className="space-y-3"
          >
            <div>
              <label className="meta block pb-1">Work email</label>
              <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
            </div>
            <Button type="submit" className="h-11 w-full">
              Email me a sign-in link
            </Button>
            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); }}
              className="meta underline underline-offset-4 hover:text-[var(--signal-deep)]"
            >
              Use a password instead
            </button>
          </form>
        )
      )}

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span className="meta">or continue with</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="h-11 w-full" onClick={() => oauth("google")}>
          Continue with Google
        </Button>
        <Button variant="outline" className="h-11 w-full" onClick={() => oauth("linkedin_oidc")}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="#0A66C2">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.8 0 0 .78 0 1.74v20.52C0 23.22.8 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.74V1.74C24 .78 23.2 0 22.22 0z" />
          </svg>
          Continue with LinkedIn
        </Button>
      </div>
    </AuthScene>
  );
}
