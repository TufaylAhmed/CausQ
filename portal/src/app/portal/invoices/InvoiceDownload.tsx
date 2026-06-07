"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function InvoiceDownload({ path }: { path: string }) {
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
    <Button size="sm" variant="outline" onClick={download}>
      Download PDF
    </Button>
  );
}
