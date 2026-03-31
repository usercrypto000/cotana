"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";

type ReviewEligibilityState = {
  allowed: boolean;
  reasons: string[];
  nextEligibleAt: string | null;
};

export function ReviewComposer({
  appId,
  canReview,
  eligibility
}: {
  appId: string;
  canReview: boolean;
  eligibility: ReviewEligibilityState | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview() {
    if (!canReview) {
      setError("Sign in to write a review.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/apps/${appId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rating: Number(rating),
          body
        })
      });

      const result = (await response.json()) as {
        error?: string;
        eligibility?: ReviewEligibilityState;
      };

      if (!response.ok) {
        setError(result.error ?? result.eligibility?.reasons?.[0] ?? "Unable to publish review.");
        return;
      }

      setBody("");
      setRating("5");
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canReview ? <p className="text-sm text-slate-500">Sign in to review this app.</p> : null}
        {canReview && eligibility && !eligibility.allowed ? (
          <div className="space-y-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">You are not eligible to post a review yet.</p>
            {eligibility.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
            {eligibility.nextEligibleAt ? (
              <p>Next review window: {new Date(eligibility.nextEligibleAt).toLocaleString()}</p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Rating</span>
            <select
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
              disabled={!canReview || !eligibility?.allowed || pending}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Review</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="min-h-36 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
              placeholder="Share what worked, what felt clear, and where the experience could improve."
              disabled={!canReview || !eligibility?.allowed || pending}
            />
          </label>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button onClick={() => void submitReview()} disabled={!canReview || !eligibility?.allowed || pending}>
          {pending ? "Publishing..." : "Publish review"}
        </Button>
      </CardContent>
    </Card>
  );
}
