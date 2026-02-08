import { getPublicStatusSnapshot } from "@/services/exploit-tracker/public-status";
import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

export const dynamic = "force-dynamic";

function fmtMs(value: number) {
  return `${Math.round(value).toLocaleString()} ms`;
}

export default async function StatusPage() {
  const snapshot = await getPublicStatusSnapshot();

  return (
    <PublicTrackerShell
      activeNav="status"
      title="Runtime Status"
      subtitle="Current ingestion posture, chain lag, and incident pipeline timing."
    >
      <section className="ht-row three">
        <article className="ht-stat">
          <span className="ht-label">Overall</span>
          <span className="ht-value">{snapshot.status.toUpperCase()}</span>
        </article>
        <article className="ht-stat">
          <span className="ht-label">Generated At</span>
          <span>{snapshot.generatedAt}</span>
        </article>
        <article className="ht-stat">
          <span className="ht-label">Uptime Expectation</span>
          <span>{snapshot.uptimeExpectation}</span>
        </article>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Ingestion Health by Chain</h2>
        <div className="ht-table-wrap">
          <table className="ht-table">
            <thead>
              <tr>
                <th>Chain</th>
                <th>Health</th>
                <th>Last Processed Block</th>
                <th>Latest Event Block</th>
                <th>Lag</th>
                <th>Last Event</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.chains.map((row) => (
                <tr key={row.chainId}>
                  <td>{row.chain}</td>
                  <td>{row.ingestionHealth}</td>
                  <td>{row.lastProcessedBlock ?? "-"}</td>
                  <td>{row.latestObservedEventBlock ?? "-"}</td>
                  <td>{row.lagBlocks ?? "-"}</td>
                  <td>{row.lastEventAt ?? "-"}</td>
                </tr>
              ))}
              {snapshot.chains.length === 0 && (
                <tr>
                  <td colSpan={6} className="ht-text-muted">
                    No chain data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ht-panel alt">
        <h2 style={{ marginTop: 0 }}>Incident Pipeline Latency (24h)</h2>
        <div className="ht-mini-grid three">
          <div>
            <div className="ht-label">Average</div>
            <div className="ht-value">{fmtMs(snapshot.incidentPipeline.avgLatencyMs)}</div>
          </div>
          <div>
            <div className="ht-label">P95</div>
            <div className="ht-value">{fmtMs(snapshot.incidentPipeline.p95LatencyMs)}</div>
          </div>
          <div>
            <div className="ht-label">Last Incident</div>
            <div>{snapshot.incidentPipeline.lastIncidentAt ?? "-"}</div>
          </div>
        </div>
      </section>
    </PublicTrackerShell>
  );
}
