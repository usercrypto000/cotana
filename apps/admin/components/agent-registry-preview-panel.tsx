"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";
import type { AgentRegistrySearchResult } from "@cotana/types";
import { useState } from "react";

type PreviewResponse = {
  query: string;
  results: AgentRegistrySearchResult[];
  error?: string;
};

export function AgentRegistryPreviewPanel() {
  const [query, setQuery] = useState("monitor lending yield rates");
  const [auth, setAuth] = useState("NONE,API_KEY");
  const [interfaceType, setInterfaceType] = useState("HTTP_API");
  const [interaction, setInteraction] = useState("READ_ONLY");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<PreviewResponse | null>(null);

  async function runPreview() {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        q: query,
        auth,
        interface: interfaceType,
        interaction
      });
      const result = await fetch(`/api/admin/agent-registry/search-preview?${params.toString()}`);
      const payload = (await result.json()) as PreviewResponse;
      setResponse(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent search preview</CardTitle>
        <p className="text-sm text-neutral-muted">
          Test how outside agents discover capabilities without creating any execution surface.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="space-y-2 text-sm text-brand-text/72 lg:col-span-2">
            <span>Agent intent</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border bg-neutral-panel px-4 text-sm text-brand-text"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-text/72">
            <span>Auth</span>
            <input
              value={auth}
              onChange={(event) => setAuth(event.target.value)}
              className="h-11 w-full rounded-xl border bg-neutral-panel px-4 text-sm text-brand-text"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-text/72">
            <span>Interface</span>
            <input
              value={interfaceType}
              onChange={(event) => setInterfaceType(event.target.value)}
              className="h-11 w-full rounded-xl border bg-neutral-panel px-4 text-sm text-brand-text"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-text/72">
            <span>Interaction</span>
            <input
              value={interaction}
              onChange={(event) => setInteraction(event.target.value)}
              className="h-11 w-full rounded-xl border bg-neutral-panel px-4 text-sm text-brand-text"
            />
          </label>
        </div>

        <Button onClick={() => void runPreview()} disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Preview results"}
        </Button>

        {response?.error ? <p className="text-sm ui-copy-danger">{response.error}</p> : null}

        <div className="grid gap-3">
          {response?.results.map((result) => (
            <div key={result.app.id} className="rounded-2xl border bg-neutral-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-brand-text">{result.app.name}</p>
                  <p className="mt-1 text-sm text-neutral-muted">{result.matchReason}</p>
                </div>
                <Badge>{result.score.toFixed(3)}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {result.matchedCapabilities.map((capability) => (
                  <div key={capability.id} className="rounded-xl bg-neutral-panel p-3 text-sm text-brand-text/72">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-brand-text">{capability.name}</span>
                      <Badge variant="secondary">{capability.authType}</Badge>
                      <Badge variant="secondary">{capability.interfaceType}</Badge>
                      <Badge variant="secondary">{capability.interactionMode}</Badge>
                    </div>
                    <p className="mt-2">{capability.matchReason}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {response && response.results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-border bg-neutral-panel p-4 text-sm text-neutral-muted">
              No compatible capability matched this intent.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
