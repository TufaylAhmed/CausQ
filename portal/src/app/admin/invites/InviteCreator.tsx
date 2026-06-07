"use client";
import { useState } from "react";
import { createInviteAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteCreator({
  orgs,
  prefillEmail,
}: {
  orgs: { id: string; name: string }[];
  prefillEmail?: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2 rounded border p-3">
      <form
        action={async (fd) => {
          setError(null);
          setToken(null);
          const r = await createInviteAction(fd);
          if (r?.error) setError(r.error);
          else if (r?.token) setToken(r.token);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div>
          <label className="block text-xs text-neutral-500">Org</label>
          <select name="org_id" required className="rounded border p-2 text-sm">
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-neutral-500">Email (optional)</label>
          <Input name="email" type="email" defaultValue={prefillEmail ?? ""} placeholder="client@company.com" />
        </div>
        <Button type="submit">Create invite</Button>
      </form>
      {token && (
        <p className="text-sm">
          Invite code: <code className="rounded bg-neutral-100 px-2 py-1">{token}</code>
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
