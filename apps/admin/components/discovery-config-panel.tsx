"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type ConfigEntry = {
  key: string;
  label: string;
  valueJson: unknown;
};

export function DiscoveryConfigPanel({ entries }: { entries: ConfigEntry[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(entries.map((entry) => [entry.key, JSON.stringify(entry.valueJson, null, 2)])),
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(key: string) {
    setSavingKey(key);
    setError(null);

    try {
      const parsed = JSON.parse(values[key] ?? "{}");
      const response = await fetch("/api/admin/discovery/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          key,
          valueJson: parsed
        })
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to save config.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Config must be valid JSON.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="grid gap-4">
      {entries.map((entry) => (
        <Card key={entry.key}>
          <CardHeader>
            <CardTitle>{entry.label}</CardTitle>
            <p className="text-sm text-slate-500">{entry.key}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={values[entry.key] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [entry.key]: event.target.value
                }))
              }
              className="min-h-56 w-full rounded-2xl border bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100"
            />
            <Button onClick={() => void save(entry.key)} disabled={savingKey === entry.key}>
              {savingKey === entry.key ? "Saving..." : "Save config"}
            </Button>
          </CardContent>
        </Card>
      ))}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
