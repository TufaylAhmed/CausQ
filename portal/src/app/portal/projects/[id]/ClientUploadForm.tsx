"use client";
import { useState } from "react";
import { uploadClientFile } from "./client-upload-actions";
import { Button } from "@/components/ui/button";

export function ClientUploadForm({ engagementId }: { engagementId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={async (fd) => {
        setBusy(true);
        setError(null);
        const r = await uploadClientFile(engagementId, fd);
        setBusy(false);
        if (r?.error) setError(r.error);
      }}
      className="flex items-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--line-strong)] bg-[var(--paper-warm)] p-3"
    >
      <input type="file" name="file" required className="text-sm" />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Uploading…" : "Upload a file"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
