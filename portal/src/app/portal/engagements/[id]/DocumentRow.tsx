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
    <div className="flex items-center justify-between rounded border p-3">
      <span className="text-sm">{filename}</span>
      <Button size="sm" variant="outline" onClick={download}>
        Download
      </Button>
    </div>
  );
}
