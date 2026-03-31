"use client";

import { AppStatus, type AppStatusValue } from "../lib/app-status";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type CategoryOption = {
  id: string;
  slug: string;
  name: string;
};

type AppRecord = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  status: AppStatusValue;
  category: {
    id: string;
  };
  tags: string[];
  screenshots: {
    imageUrl: string;
  }[];
};

type FormState = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  categoryId: string;
  tags: string;
  screenshots: string;
};

function buildInitialState(app?: AppRecord): FormState {
  return {
    slug: app?.slug ?? "",
    name: app?.name ?? "",
    shortDescription: app?.shortDescription ?? "",
    longDescription: app?.longDescription ?? "",
    websiteUrl: app?.websiteUrl ?? "",
    logoUrl: app?.logoUrl ?? "",
    verified: app?.verified ?? false,
    categoryId: app?.category.id ?? "",
    tags: app?.tags.join(", ") ?? "",
    screenshots: app?.screenshots.map((item) => item.imageUrl).join("\n") ?? ""
  };
}

function normalizeList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function AdminAppForm({
  mode,
  categories,
  app
}: {
  mode: "create" | "edit";
  categories: CategoryOption[];
  app?: AppRecord;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => buildInitialState(app));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  async function submit(status?: AppStatusValue) {
    setSaving(status ?? "SAVE");
    setError(null);

    try {
      const payload = {
        slug: form.slug,
        name: form.name,
        shortDescription: form.shortDescription,
        longDescription: form.longDescription,
        websiteUrl: form.websiteUrl,
        logoUrl: form.logoUrl,
        verified: form.verified,
        categoryId: form.categoryId,
        tags: normalizeList(form.tags),
        screenshots: normalizeList(form.screenshots),
        status
      };

      const response = await fetch(mode === "create" ? "/api/admin/apps" : `/api/admin/apps/${app?.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as { error?: { formErrors?: string[] } | string; app?: AppRecord };

      if (!response.ok || !result.app) {
        setError(typeof result.error === "string" ? result.error : "Unable to save app.");
        return;
      }

      const savedApp = result.app;

      startTransition(() => {
        router.push(`/apps/${savedApp.id}`);
        router.refresh();
      });
    } finally {
      setSaving(null);
    }
  }

  async function updateStatus(action: "publish" | "unpublish") {
    if (!app) {
      await submit(action === "publish" ? AppStatus.PUBLISHED : AppStatus.DRAFT);
      return;
    }

    setSaving(action);
    setError(null);

    try {
      const response = await fetch(`/api/admin/apps/${app.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action })
      });

      if (!response.ok) {
        setError("Unable to update app status.");
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{mode === "create" ? "Create app" : "Edit app"}</CardTitle>
          <p className="mt-2 text-sm text-slate-500">
            Keep the public card minimal. Detailed copy, tags, and screenshots still feed discovery and ranking.
          </p>
        </div>
        {app ? <Badge>{app.status}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
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
            <span>Website URL</span>
            <input
              value={form.websiteUrl}
              onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Logo URL</span>
            <input
              value={form.logoUrl}
              onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Category</span>
            <select
              value={form.categoryId}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              <option value="">Select a category</option>
              {categories
                .filter((category) => category.slug !== "all")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border p-4 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(event) => setForm((current) => ({ ...current, verified: event.target.checked }))}
            />
            Mark as verified
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-600">
          <span>Short description</span>
          <textarea
            value={form.shortDescription}
            onChange={(event) => setForm((current) => ({ ...current, shortDescription: event.target.value }))}
            className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
          />
        </label>

        <label className="space-y-2 text-sm text-slate-600">
          <span>Long description</span>
          <textarea
            value={form.longDescription}
            onChange={(event) => setForm((current) => ({ ...current, longDescription: event.target.value }))}
            className="min-h-40 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Tags</span>
            <textarea
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              className="min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
              placeholder="yield, savings, stablecoins"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Screenshots</span>
            <textarea
              value={form.screenshots}
              onChange={(event) => setForm((current) => ({ ...current, screenshots: event.target.value }))}
              className="min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
              placeholder="One image URL per line"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void submit(AppStatus.DRAFT)} disabled={Boolean(saving)}>
            {saving === AppStatus.DRAFT ? "Saving..." : mode === "create" ? "Create draft" : "Save draft"}
          </Button>
          <Button variant="secondary" onClick={() => void updateStatus("publish")} disabled={Boolean(saving)}>
            {saving === "publish" || saving === AppStatus.PUBLISHED ? "Publishing..." : mode === "create" ? "Create and publish" : "Publish"}
          </Button>
          {app?.status === AppStatus.PUBLISHED ? (
            <Button variant="outline" onClick={() => void updateStatus("unpublish")} disabled={Boolean(saving)}>
              {saving === "unpublish" ? "Updating..." : "Unpublish"}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
