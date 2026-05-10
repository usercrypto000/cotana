"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";
import {
  EditorialShelfStatus,
  editorialShelfStatusValues,
  EditorialShelfVisibility,
  editorialShelfVisibilityValues,
  type EditorialShelfStatusValue,
  type EditorialShelfVisibilityValue
} from "../lib/editorial-shelf";

type CategoryOption = {
  id: string;
  slug: string;
  name: string;
};

type AppOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type ShelfRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: EditorialShelfStatusValue;
  sortOrder: number;
  visibility: EditorialShelfVisibilityValue;
  pinned: boolean;
  category: CategoryOption | null;
  items: Array<{
    app: AppOption;
  }>;
};

type FormState = {
  title: string;
  slug: string;
  description: string;
  status: EditorialShelfStatusValue;
  sortOrder: number;
  visibility: EditorialShelfVisibilityValue;
  pinned: boolean;
  categoryId: string;
  appIds: string[];
};

function buildInitialState(shelf?: ShelfRecord): FormState {
  return {
    title: shelf?.title ?? "",
    slug: shelf?.slug ?? "",
    description: shelf?.description ?? "",
    status: shelf?.status ?? EditorialShelfStatus.DRAFT,
    sortOrder: shelf?.sortOrder ?? 0,
    visibility: shelf?.visibility ?? EditorialShelfVisibility.HOME,
    pinned: shelf?.pinned ?? false,
    categoryId: shelf?.category?.id ?? "",
    appIds: shelf?.items.map((item) => item.app.id) ?? []
  };
}

export function AdminShelfForm({
  mode,
  shelf,
  categories,
  apps
}: {
  mode: "create" | "edit";
  shelf?: ShelfRecord;
  categories: CategoryOption[];
  apps: AppOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(shelf));
  const [selectedAppId, setSelectedAppId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableApps = useMemo(
    () => apps.filter((app) => !form.appIds.includes(app.id)),
    [apps, form.appIds],
  );

  async function submit() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(mode === "create" ? "/api/admin/shelves" : `/api/admin/shelves/${shelf?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || null
        })
      });

      const result = (await response.json()) as { shelf?: ShelfRecord; error?: string };

      if (!response.ok || !result.shelf) {
        setError(result.error ?? "Unable to save shelf.");
        return;
      }

      startTransition(() => {
        router.push(`/shelves/${result.shelf?.id}`);
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  function moveApp(index: number, direction: -1 | 1) {
    setForm((current) => {
      const next = [...current.appIds];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex] ?? "", next[index] ?? ""];
      return {
        ...current,
        appIds: next
      };
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{mode === "create" ? "Create shelf" : "Edit shelf"}</CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            Editorial shelves are manually curated and ordered. Keep them tight and intentional.
          </p>
        </div>
        {shelf ? <Badge>{shelf.status}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Slug</span>
            <input
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as EditorialShelfStatusValue }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              {editorialShelfStatusValues.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Visibility</span>
            <select
              value={form.visibility}
              onChange={(event) =>
                setForm((current) => ({ ...current, visibility: event.target.value as EditorialShelfVisibilityValue }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              {editorialShelfVisibilityValues.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Sort order</span>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) =>
                setForm((current) => ({ ...current, sortOrder: Number(event.target.value || 0) }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Category scope</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              <option value="">Global</option>
              {categories
                .filter((category) => category.slug !== "all")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-600">
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
          />
        </label>

        <label className="flex items-center gap-3 rounded-xl border p-4 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.pinned}
            onChange={(event) => setForm((current) => ({ ...current, pinned: event.target.checked }))}
          />
          Pin on homepage ordering
        </label>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-64 flex-1">
              <select
                value={selectedAppId}
                onChange={(event) => setSelectedAppId(event.target.value)}
                className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
              >
                <option value="">Add app to shelf</option>
                {availableApps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.status})
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                if (!selectedAppId) {
                  return;
                }

                setForm((current) => ({
                  ...current,
                  appIds: [...current.appIds, selectedAppId]
                }));
                setSelectedAppId("");
              }}
            >
              Add app
            </Button>
          </div>
          <div className="space-y-2">
            {form.appIds.map((appId, index) => {
              const app = apps.find((entry) => entry.id === appId);

              if (!app) {
                return null;
              }

              return (
                <div
                  key={app.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700"
                >
                  <div>
                    <p className="font-medium text-slate-950">{app.name}</p>
                    <p className="text-slate-500">{app.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => moveApp(index, -1)} disabled={index === 0}>
                      Up
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => moveApp(index, 1)}
                      disabled={index === form.appIds.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          appIds: current.appIds.filter((currentAppId) => currentAppId !== app.id)
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
            {form.appIds.length === 0 ? (
              <p className="text-sm text-slate-500">Add apps to define the shelf order.</p>
            ) : null}
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-3">
          <Button onClick={() => void submit()} disabled={saving}>
            {saving ? "Saving..." : mode === "create" ? "Create shelf" : "Save shelf"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
