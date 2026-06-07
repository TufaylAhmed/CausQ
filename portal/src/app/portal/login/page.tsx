"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMagicLink } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Sign in to the portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm text-neutral-600">Check your email for a sign-in link.</p>
          ) : (
            <form
              action={async (fd) => {
                const r = await sendMagicLink(fd);
                if (r?.error) setError(r.error);
                else setSent(true);
              }}
              className="space-y-3"
            >
              <Input name="email" type="email" placeholder="you@company.com" required />
              <Button type="submit" className="w-full">
                Email me a sign-in link
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="h-px flex-1 bg-neutral-200" />or
            <span className="h-px flex-1 bg-neutral-200" />
          </div>
          <Button variant="outline" className="w-full" onClick={() => oauth("google")}>
            Continue with Google
          </Button>
          <Button variant="outline" className="w-full" onClick={() => oauth("azure")}>
            Continue with Microsoft
          </Button>
          <p className="text-center text-xs text-neutral-500">
            No account?{" "}
            <a className="underline" href="/portal/request-access">
              Request access
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
