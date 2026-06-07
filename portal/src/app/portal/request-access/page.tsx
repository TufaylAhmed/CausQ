"use client";
import { useState } from "react";
import { requestAccess } from "./actions";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RequestAccessPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthScene
      kicker="Request access"
      title="Get set up on the portal"
      foot={
        <>
          Already have access?{" "}
          <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal/login">
            Sign in
          </a>
        </>
      }
    >
      {done ? (
        <div className="panel p-5">
          <p className="kicker mb-2">Request received</p>
          <p className="text-sm text-[var(--ink-mute)]">
            Thanks. A CausQ administrator will be in touch to set up your account.
          </p>
        </div>
      ) : (
        <form
          action={async (fd) => {
            const r = await requestAccess(fd);
            if (r?.error) setError(r.error);
            else setDone(true);
          }}
          className="space-y-3"
        >
          <div>
            <label className="meta block pb-1">Your name</label>
            <Input name="name" placeholder="Jane Doe" required className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">Work email</label>
            <Input name="email" type="email" placeholder="you@company.com" required className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">Company</label>
            <Input name="company" placeholder="Acme Corp" className="h-11" />
          </div>
          <div>
            <label className="meta block pb-1">What do you need access to?</label>
            <textarea
              name="message"
              rows={3}
              placeholder="A line about your engagement"
              className="w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--paper)] p-3 text-sm outline-none focus:border-[var(--signal)]"
            />
          </div>
          <Button type="submit" className="h-11 w-full">
            Request access
          </Button>
          {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
        </form>
      )}
    </AuthScene>
  );
}
