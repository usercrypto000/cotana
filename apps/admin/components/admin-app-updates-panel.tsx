"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import { AppUpdateType, appUpdateTypeValues, type AppUpdateTypeValue } from "../lib/app-update";

type AppUpdateRecord = {
  id: string;
  versionLabel: string;
  title: string;
  body: string;
  publishedAt: string | Date;
  type: AppUpdateTypeValue | null;
};

type FormState = {
  versionLabel: string;
  title: string;
  body: string;
  publishedAt: string;
  type: AppUpdateTypeValue | "";
};

function toDatetimeLocal(value: string | Date) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildInitialState(update?: AppUpdateRecord): FormState {
  return {
    versionLabel: update?.versionLabel ?? "",
    title: update?.title ?? "",
    body: update?.body ?? "",
    publishedAt: update ? toDatetimeLocal(update.publishedAt) : toDatetimeLocal(new Date()),
    type: update?.type ?? ""
  };
}

export function AdminAppUpdatesPanel({
  appId,
  initialUpdates
}: {
  appId: string;
  initialUpdates: AppUpdateRecord[];
}) {
  const router = useRouter();
  const [updates, setUpdates] = useState(initialUpdates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => buildInitialState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editingUpdate = useMemo(
    () => updates.find((update) => update.id === editingId) ?? null,
    [editingId, updates],
  );

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        editingUpdate
          ? `/api/admin/apps/${appId}/updates/${editingUpdate.id}`
          : `/api/admin/apps/${appId}/updates`,
        {
          method: editingUpdate ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            versionLabel: form.versionLabel,
            title: form.title,
            body: form.body,
            publishedAt: new Date(form.publishedAt).toISOString(),
            type: form.type || null
          })
        },
      );

      const result = (await response.json()) as { update?: AppUpdateRecord; updates?: AppUpdateRecord[]; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Unable to save update.");
        return;
      }

      if (Array.isArray(result.updates)) {
        setUpdates(result.updates);
      } else if (result.update) {
        const savedUpdate = result.update;
        setUpdates((current) => {
          const next = editingUpdate
            ? current.map((update) => (update.id === savedUpdate.id ? savedUpdate : update))
            : [savedUpdate, ...current];

          return next.sort(
            (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
          );
        });
      }

      setEditingId(null);
      setForm(buildInitialState());
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove(updateId: string) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/apps/${appId}/updates/${updateId}`, {
        method: "DELETE"
      });
      const result = (await response.json()) as { updates?: AppUpdateRecord[]; error?: string };

      if (!response.ok || !Array.isArray(result.updates)) {
        setError(result.error ?? "Unable to delete update.");
        return;
      }

      setUpdates(result.updates);
      if (editingId === updateId) {
        setEditingId(null);
        setForm(buildInitialState());
      }
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  function startEditing(update: AppUpdateRecord) {
    setEditingId(update.id);
    setForm(buildInitialState(update));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changelog updates</CardTitle>
        <p className="text-sm text-slate-500">Ship concise updates so app detail pages stay fresh and useful.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Version or label</span>
            <input
              value={form.versionLabel}
              onChange={(event) => setForm((current) => ({ ...current, versionLabel: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Type</span>
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as AppUpdateTypeValue | "" }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              <option value="">General</option>
              {appUpdateTypeValues.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
            <span>Body</span>
            <textarea
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              className="min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Published at</span>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(event) => setForm((current) => ({ ...current, publishedAt: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving..." : editingUpdate ? "Save update" : "Add update"}
          </Button>
          {editingUpdate ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(buildInitialState());
              }}
              disabled={saving}
            >
              Cancel edit
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {updates.map((update) => (
            <div key={update.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{update.title}</p>
                    <Badge variant="secondary">{update.versionLabel}</Badge>
                    {update.type ? <Badge>{update.type}</Badge> : <Badge>{AppUpdateType.GENERAL}</Badge>}
                  </div>
                  <p className="text-sm text-slate-500">{new Date(update.publishedAt).toLocaleString()}</p>
                  <p className="text-sm leading-6 text-slate-700">{update.body}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => startEditing(update)} disabled={saving}>
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => void remove(update.id)} disabled={saving}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {updates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No updates published yet.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
