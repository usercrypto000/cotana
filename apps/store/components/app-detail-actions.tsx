"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "@cotana/ui";

export function AppDetailActions({
  appId,
  initiallyLiked,
  initiallySaved,
  initialLikeCount,
  canInteract
}: {
  appId: string;
  initiallyLiked: boolean;
  initiallySaved: boolean;
  initialLikeCount: number;
  canInteract: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initiallyLiked);
  const [saved, setSaved] = useState(initiallySaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [pendingAction, setPendingAction] = useState<"like" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleLike() {
    if (!canInteract) {
      setError("Sign in to like and save apps.");
      return;
    }

    setPendingAction("like");
    setError(null);

    try {
      const nextLiked = !liked;
      const response = await fetch(`/api/apps/${appId}/like`, {
        method: nextLiked ? "POST" : "DELETE"
      });
      const result = (await response.json()) as { likeCount?: number; error?: string };

      if (!response.ok || typeof result.likeCount !== "number") {
        setError(result.error ?? "Unable to update like.");
        return;
      }

      setLiked(nextLiked);
      setLikeCount(result.likeCount);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleSave() {
    if (!canInteract) {
      setError("Sign in to save apps.");
      return;
    }

    setPendingAction("save");
    setError(null);

    try {
      const nextSaved = !saved;
      const response = await fetch(`/api/apps/${appId}/library`, {
        method: nextSaved ? "POST" : "DELETE"
      });
      const result = (await response.json()) as { saved?: boolean; error?: string };

      if (!response.ok || typeof result.saved !== "boolean") {
        setError(result.error ?? "Unable to update your library.");
        return;
      }

      setSaved(result.saved);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void toggleSave()} disabled={Boolean(pendingAction)}>
          {pendingAction === "save" ? "Saving..." : saved ? "Saved to library" : "Save to library"}
        </Button>
        <Button variant="secondary" onClick={() => void toggleLike()} disabled={Boolean(pendingAction)}>
          {pendingAction === "like" ? "Updating..." : liked ? `Liked (${likeCount})` : `Like (${likeCount})`}
        </Button>
      </div>
      {!canInteract ? <p className="text-sm text-slate-500">Sign in to like, save, and review apps.</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
