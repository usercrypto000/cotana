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
        <p className="text-sm text-slate-500">
          Test how outside agents discover capabilities without creating any execution surface.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
            <span>Agent intent</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Auth</span>
            <input
              value={auth}
              onChange={(event) => setAuth(event.target.value)}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Interface</span>
            <input
              value={interfaceType}
              onChange={(event) => setInterfaceType(event.target.value)}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span>Interaction</span>
            <input
              value={interaction}
              onChange={(event) => setInteraction(event.target.value)}
              className="h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950"
            />
          </label>
        </div>

        <Button onClick={() => void runPreview()} disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Preview results"}
        </Button>

        {response?.error ? <p className="text-sm text-rose-600">{response.error}</p> : null}

        <div className="grid gap-3">
          {response?.results.map((result) => (
            <div key={result.app.id} className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-950">{result.app.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{result.matchReason}</p>
                </div>
                <Badge>{result.score.toFixed(3)}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {result.matchedCapabilities.map((capability) => (
                  <div key={capability.id} className="rounded-xl bg-white p-3 text-sm text-slate-600">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-950">{capability.name}</span>
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
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No compatible capability matched this intent.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
