"use client";
import { useState } from "react";
import { requestAccess } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RequestAccessPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="font-mono text-xs uppercase tracking-widest text-brand-deep">CausQ</p>
          <CardTitle>Request portal access</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <p className="text-sm text-neutral-600">
              Thanks. A CausQ administrator will be in touch to set up your account.
            </p>
          ) : (
            <form
              action={async (fd) => {
                const r = await requestAccess(fd);
                if (r?.error) setError(r.error);
                else setDone(true);
              }}
              className="space-y-3"
            >
              <Input name="name" placeholder="Your name" required />
              <Input name="email" type="email" placeholder="you@company.com" required />
              <Input name="company" placeholder="Company" />
              <textarea
                name="message"
                placeholder="What do you need access to?"
                className="w-full rounded border p-2 text-sm"
                rows={3}
              />
              <Button type="submit" className="w-full">
                Request access
              </Button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
