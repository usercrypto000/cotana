"use client";

import { useState } from "react";
import { Button } from "@cotana/ui";

export function ReviewFlagButton({
  reviewId,
  canFlag
}: {
  reviewId: string;
  canFlag: boolean;
}) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitFlag() {
    if (!canFlag) {
      setMessage("Sign in to flag a review.");
      return;
    }

    setPending(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}/flag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(result.error ?? "Unable to flag this review.");
        return;
      }

      setReason("");
      setOpen(false);
      setMessage("Review flagged for admin review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={() => setOpen((current) => !current)} disabled={pending}>
        {open ? "Cancel flag" : "Flag review"}
      </Button>
      {open ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 p-4">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
            placeholder="Tell the moderation team what looks off about this review."
            disabled={pending}
          />
          <Button onClick={() => void submitFlag()} disabled={pending}>
            {pending ? "Submitting..." : "Submit flag"}
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
