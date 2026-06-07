"use client";
import { useState } from "react";
import { createCheckout } from "./pay-actions";
import { Button } from "@/components/ui/button";

export function PayButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const r = await createCheckout(invoiceId);
          setBusy(false);
          if (r?.error) setError(r.error);
          else if (r?.url) window.location.href = r.url;
        }}
      >
        {busy ? "…" : "Pay now"}
      </Button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </>
  );
}
