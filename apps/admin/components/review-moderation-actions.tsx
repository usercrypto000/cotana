"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "@cotana/ui";

export function ReviewModerationActions({
  reviewId
}: {
  reviewId: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"dismiss" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: "dismiss" | "remove") {
    setPendingAction(action);
    setError(null);

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: action === "remove" ? JSON.stringify({ reason: "Removed by admin moderation." }) : undefined
      });

      if (!response.ok) {
        setError("Unable to update moderation state.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void runAction("dismiss")} variant="secondary" disabled={Boolean(pendingAction)}>
          {pendingAction === "dismiss" ? "Dismissing..." : "Dismiss flags"}
        </Button>
        <Button onClick={() => void runAction("remove")} variant="outline" disabled={Boolean(pendingAction)}>
          {pendingAction === "remove" ? "Removing..." : "Remove review"}
        </Button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
