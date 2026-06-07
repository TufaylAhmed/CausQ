"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DocumentRow({ path, filename }: { path: string; filename: string }) {
  async function download() {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error || !data) {
      alert("Unable to generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper-warm)] px-3 py-2.5">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="meta">↧</span>
        <span className="truncate">{filename}</span>
      </span>
      <Button size="sm" variant="outline" onClick={download}>
        Download
      </Button>
    </div>
  );
}
