import { cotanaRegistryContract, registryClientExamples } from "@cotana/config";
import { Card, CardContent, CardHeader, CardTitle } from "@cotana/ui";

const endpointRows = Object.entries(cotanaRegistryContract.endpoints).filter(([key]) => key !== "docs");

export default function AgentRegistryDocsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <section className="space-y-3">
        <p className="font-heading text-sm uppercase tracking-[0.16em] text-brand-primary">Agent registry</p>
        <h1 className="font-heading text-4xl font-semibold text-brand-text">Cotana machine-client registry</h1>
        <p className="max-w-3xl text-neutral-muted">
          Cotana helps outside agents, assistants, and workflow systems discover apps and machine-readable
          capabilities. Cotana does not execute actions, handle credentials, initiate wallet activity, or route
          instructions downstream.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-neutral-muted">Registry version</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-brand-text">{cotanaRegistryContract.registryVersion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-neutral-muted">Schema version</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-brand-text">{cotanaRegistryContract.schemaVersion}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-neutral-muted">Boundary</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-brand-text">Discovery only</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {endpointRows.map(([label, path]) => (
            <div key={label} className="grid gap-2 rounded-xl border p-3 text-sm md:grid-cols-[180px_1fr]">
              <span className="font-medium text-brand-text">{label}</span>
              <code className="text-brand-text/72">{path}</code>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Query parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-brand-text/72">
            <p><code>q</code> searches capability intent on `/api/agent-registry/search`.</p>
            <p><code>category</code> narrows registry list, search, and compatibility reports.</p>
            <p><code>auth</code>, <code>interface</code>, and <code>interaction</code> accept comma-separated compatibility filters.</p>
            <p><code>limit</code> limits search results from 1 to 25.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-brand-text/72">
            <p>Public manifests expose current version, review, quality, and deprecation metadata.</p>
            <p>Deprecated capabilities are excluded from default search but may be explained by direct manifest reads.</p>
            <p>Compatibility reports include deterministic confidence scores and blocking gaps.</p>
            <p>Rate limits apply to registry search. The response metadata repeats supported filters and the no-execution rule.</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Example requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {registryClientExamples.map((example) => (
            <div key={example.label} className="rounded-card border border-neutral-border bg-neutral-surface p-3">
              <p className="font-heading text-sm font-semibold text-brand-text">{example.label}</p>
              <code className="mt-1 block overflow-x-auto font-mono text-xs text-neutral-muted">{example.command}</code>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
