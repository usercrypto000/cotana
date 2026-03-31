"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Button } from "@cotana/ui";

export function SignalJobControls({
  jobKey
}: {
  jobKey: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runJob() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/signals/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jobKey
        })
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to run job.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={() => void runJob()} disabled={pending}>
        {pending ? "Running..." : "Run now"}
      </Button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
