"use client";
import { useRef, useState } from "react";
import { sendMessage } from "./messages-actions";
import { Button } from "@/components/ui/button";

export function MessageComposer({ engagementId }: { engagementId: string }) {
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (fd) => {
        setError(null);
        const r = await sendMessage(engagementId, fd);
        if (r?.error) setError(r.error);
        else formRef.current?.reset();
      }}
      className="space-y-2"
    >
      <textarea
        name="body"
        required
        rows={2}
        placeholder="Write a message…"
        className="w-full rounded border p-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Send
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
