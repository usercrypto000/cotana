"use client";

import {
  agentAuthTypeValues,
  agentCapabilityStatusValues,
  agentInteractionModeValues,
  agentInterfaceTypeValues,
  agentListingStatusValues,
  appAudienceValues,
  type AgentAuthTypeValue,
  type AgentCapabilityStatusValue,
  type AgentInteractionModeValue,
  type AgentInterfaceTypeValue,
  type AgentListingStatusValue,
  type AppAudienceValue
} from "../lib/agent-config";
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
  verifiedNote: string | null;
  agentAudience: AppAudienceValue;
  agentListingStatus: AgentListingStatusValue;
  agentSummary: string | null;
  agentDocsUrl: string | null;
  agentIntegrationNotes: string | null;
  status: AppStatusValue;
  category: {
    id: string;
  };
  tags: string[];
  screenshots: {
    imageUrl: string;
  }[];
  agentCapabilities: AgentCapabilityFormRecord[];
};

type AgentCapabilityFormRecord = {
  name: string;
  slug?: string;
  description: string;
  capabilityType: string;
  authType: AgentAuthTypeValue;
  interfaceType: AgentInterfaceTypeValue;
  interactionMode: AgentInteractionModeValue;
  endpointUrl?: string | null;
  docsUrl?: string | null;
  inputSchemaJson?: unknown | null;
  outputSchemaJson?: unknown | null;
  safetyNotes?: string | null;
  status: AgentCapabilityStatusValue;
  reliabilityScore?: number | null;
  latencyP50Ms?: number | null;
};

type FormState = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  verifiedNote: string;
  agentAudience: AppAudienceValue;
  agentListingStatus: AgentListingStatusValue;
  agentSummary: string;
  agentDocsUrl: string;
  agentIntegrationNotes: string;
  categoryId: string;
  tags: string;
  screenshots: string;
  agentCapabilitiesJson: string;
};

const defaultAgentCapability: AgentCapabilityFormRecord = {
  name: "Search catalog",
  slug: "search-catalog",
  description: "Lets an agent discover relevant app data for a user intent.",
  capabilityType: "search",
  authType: "NONE",
  interfaceType: "HTTP_API",
  interactionMode: "READ_ONLY",
  endpointUrl: null,
  docsUrl: "https://example.com/docs/agent-api",
  inputSchemaJson: {
    type: "object",
    properties: {
      query: {
        type: "string"
      }
    },
    required: ["query"]
  },
  outputSchemaJson: {
    type: "object",
    properties: {
      results: {
        type: "array"
      }
    }
  },
  safetyNotes: "Read-only capability.",
  status: "ACTIVE",
  reliabilityScore: null,
  latencyP50Ms: null
};

function buildInitialState(app?: AppRecord): FormState {
  const agentCapabilities = app?.agentCapabilities?.length ? app.agentCapabilities : [];

  return {
    slug: app?.slug ?? "",
    name: app?.name ?? "",
    shortDescription: app?.shortDescription ?? "",
    longDescription: app?.longDescription ?? "",
    websiteUrl: app?.websiteUrl ?? "",
    logoUrl: app?.logoUrl ?? "",
    verified: app?.verified ?? false,
    verifiedNote: app?.verifiedNote ?? "",
    agentAudience: app?.agentAudience ?? "HUMAN",
    agentListingStatus: app?.agentListingStatus ?? "NOT_APPLICABLE",
    agentSummary: app?.agentSummary ?? "",
    agentDocsUrl: app?.agentDocsUrl ?? "",
    agentIntegrationNotes: app?.agentIntegrationNotes ?? "",
    categoryId: app?.category.id ?? "",
    tags: app?.tags.join(", ") ?? "",
    screenshots: app?.screenshots.map((item) => item.imageUrl).join("\n") ?? "",
    agentCapabilitiesJson: JSON.stringify(agentCapabilities, null, 2)
  };
}

function normalizeList(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseAgentCapabilities(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Agent capabilities must be a JSON array.");
  }

  return parsed as AgentCapabilityFormRecord[];
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
      const agentCapabilities = parseAgentCapabilities(form.agentCapabilitiesJson);
      const payload = {
        slug: form.slug,
        name: form.name,
        shortDescription: form.shortDescription,
        longDescription: form.longDescription,
        websiteUrl: form.websiteUrl,
        logoUrl: form.logoUrl,
        verified: form.verified,
        verifiedNote: form.verifiedNote,
        agentAudience: form.agentAudience,
        agentListingStatus: form.agentListingStatus,
        agentSummary: form.agentSummary,
        agentDocsUrl: form.agentDocsUrl || null,
        agentIntegrationNotes: form.agentIntegrationNotes,
        categoryId: form.categoryId,
        tags: normalizeList(form.tags),
        screenshots: normalizeList(form.screenshots),
        agentCapabilities,
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

  function setAgentCapabilitiesToExample() {
    setForm((current) => ({
      ...current,
      agentCapabilitiesJson: JSON.stringify([defaultAgentCapability], null, 2)
    }));
  }

  async function submitWithErrorBoundary(status?: AppStatusValue) {
    try {
      await submit(status);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save app.");
    }
  }

  async function updateStatus(action: "publish" | "unpublish") {
    if (!app) {
      await submitWithErrorBoundary(action === "publish" ? AppStatus.PUBLISHED : AppStatus.DRAFT);
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

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span>Audience</span>
            <select
              value={form.agentAudience}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  agentAudience: event.target.value as AppAudienceValue,
                  agentListingStatus:
                    event.target.value === "HUMAN" ? "NOT_APPLICABLE" : current.agentListingStatus
                }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              {appAudienceValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Agent registry status</span>
            <select
              value={form.agentListingStatus}
              onChange={(event) =>
                setForm((current) => ({ ...current, agentListingStatus: event.target.value as AgentListingStatusValue }))
              }
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            >
              {agentListingStatusValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Agent summary</span>
            <textarea
              value={form.agentSummary}
              onChange={(event) => setForm((current) => ({ ...current, agentSummary: event.target.value }))}
              className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
              placeholder="What can an AI agent safely use this app for?"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Agent docs URL</span>
            <input
              value={form.agentDocsUrl}
              onChange={(event) => setForm((current) => ({ ...current, agentDocsUrl: event.target.value }))}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
              placeholder="https://docs.example.com/agents"
            />
          </label>
        </div>

        <label className="space-y-2 text-sm text-slate-600">
          <span>Agent integration notes</span>
          <textarea
            value={form.agentIntegrationNotes}
            onChange={(event) => setForm((current) => ({ ...current, agentIntegrationNotes: event.target.value }))}
            className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
            placeholder="Internal notes for registry review. This is not shown publicly."
          />
        </label>

        <label className="space-y-2 text-sm text-slate-600">
          <span>Verified note</span>
          <textarea
            value={form.verifiedNote}
            onChange={(event) => setForm((current) => ({ ...current, verifiedNote: event.target.value }))}
            className="min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-950"
            placeholder="Internal note for why this app is verified."
          />
        </label>

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

        <label className="space-y-2 text-sm text-slate-600">
          <span>Agent capabilities JSON</span>
          <textarea
            value={form.agentCapabilitiesJson}
            onChange={(event) => setForm((current) => ({ ...current, agentCapabilitiesJson: event.target.value }))}
            className="min-h-72 w-full rounded-xl border bg-white px-4 py-3 font-mono text-xs text-slate-950"
            placeholder={`Allowed auth types: ${agentAuthTypeValues.join(", ")}. Interface values: ${agentInterfaceTypeValues.join(", ")}. Interaction modes: ${agentInteractionModeValues.join(", ")}. Status values: ${agentCapabilityStatusValues.join(", ")}.`}
          />
        </label>
        <Button type="button" variant="outline" onClick={setAgentCapabilitiesToExample}>
          Reset agent example
        </Button>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void submitWithErrorBoundary(AppStatus.DRAFT)} disabled={Boolean(saving)}>
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
