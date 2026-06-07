"use client";
import { useState } from "react";
import { redeemInvite } from "./actions";
import { AuthScene } from "@/components/AuthScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InvitePage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthScene
      kicker="Invite"
      title="Redeem your invite code"
      foot={
        <a className="font-medium text-[var(--signal-deep)] underline underline-offset-4" href="/portal">
          Back to portal
        </a>
      }
    >
      <form
        action={async (fd) => {
          const r = await redeemInvite(fd);
          if (r?.error) setError(r.error);
        }}
        className="space-y-3"
      >
        <label className="meta block">Invite code</label>
        <Input name="token" placeholder="e.g. 7f3k9a2b…" required className="h-11 font-mono" />
        <Button type="submit" className="h-11 w-full">
          Redeem
        </Button>
        {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      </form>
    </AuthScene>
  );
}
