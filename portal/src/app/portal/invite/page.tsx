"use client";
import { useState } from "react";
import { redeemInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InvitePage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Redeem an invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              const r = await redeemInvite(fd);
              if (r?.error) setError(r.error);
            }}
            className="space-y-3"
          >
            <Input name="token" placeholder="Invite code" required />
            <Button type="submit" className="w-full">
              Redeem
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
