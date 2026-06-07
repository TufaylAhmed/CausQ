"use client";
import { useState } from "react";
import { signUpPassword } from "./actions";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  return (
    <AuthScene
      kicker="Create account"
      title="Set up your access"
      foot={
        <>
          Already have an account?{" "}
          <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/login">
            Sign in
          </a>
        </>
      }
    >
      {confirm ? (
        <div className="panel p-5">
          <p className="kicker mb-2">Almost there</p>
          <p className="text-sm text-[var(--ink-mute)]">
            Check your email to confirm your address, then sign in. Your account
            stays pending until a CausQ administrator approves it.
          </p>
        </div>
      ) : (
        <form
          action={async (fd) => {
            setError(null);
            const r = await signUpPassword(fd);
            if (r?.error) setError(r.error);
            else if (r?.confirm) setConfirm(true);
          }}
          className="space-y-3"
        >
          <div>
            <label className="meta block pb-1">Full name</label>
            <Input name="name" placeholder="Jane Doe" className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">Work email</label>
            <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">Password</label>
            <Input
              name="password"
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              className="h-11"
            />
          </div>
          <Button type="submit" className="h-11 w-full">
            Create account
          </Button>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
          <p className="meta pt-1">
            After signing up you will be in a pending state until an administrator
            approves your access.
          </p>
        </form>
      )}
    </AuthScene>
  );
}
