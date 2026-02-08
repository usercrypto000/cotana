import Link from "next/link";
import { IncidentLifecycleState } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { chainName, taxonomyLabel } from "@/services/exploit-tracker/public-intel";
import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

export const dynamic = "force-dynamic";

function ago(date: Date) {
  const delta = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function usd(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

export default async function HomePage() {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [last24h, active, weekRows] = await Promise.all([
    prisma.incident.findMany({
      where: { updatedAt: { gte: since24h } },
      include: { ruleHits: { orderBy: { createdAt: "desc" }, take: 20 } },
      orderBy: { updatedAt: "desc" },
      take: 80,
    }),
    prisma.incident.findMany({
      where: {
        lifecycleState: {
          in: [
            IncidentLifecycleState.OPEN,
            IncidentLifecycleState.EXPANDING,
            IncidentLifecycleState.CONTAINED,
          ],
        },
      },
      include: { ruleHits: { orderBy: { createdAt: "desc" }, take: 20 } },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      take: 40,
    }),
    prisma.incident.findMany({
      where: { updatedAt: { gte: since7d } },
      include: { ruleHits: { orderBy: { createdAt: "desc" }, take: 20 } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
  ]);

  const biggestThisWeek =
    weekRows
      .slice()
      .sort((a, b) => Number(b.peakLossUsd ?? 0) - Number(a.peakLossUsd ?? 0))[0] ?? null;

  const vectorDist = new Map<string, number>();
  const chainDist = new Map<number, number>();
  let total7dLoss = 0;

  for (const row of weekRows) {
    const label = taxonomyLabel({
      incidentType: row.incidentType,
      ruleHits: row.ruleHits,
      ruleSummary: row.ruleSummary,
    });
    vectorDist.set(label, (vectorDist.get(label) ?? 0) + 1);
    chainDist.set(row.chainId, (chainDist.get(row.chainId) ?? 0) + 1);
    total7dLoss += Number(row.estimatedTotalLossUsd ?? 0);
  }

  const vectorRows = Array.from(vectorDist.entries()).sort((a, b) => b[1] - a[1]);
  const chainRows = Array.from(chainDist.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <PublicTrackerShell
      activeNav="overview"
      title="Live Exploit Intelligence"
      subtitle="Incident evidence, lifecycle movement, and on-chain attribution in one operator view."
    >
      <section className="ht-row four">
        <article className="ht-stat">
          <span className="ht-label">Incidents in 24h</span>
          <span className="ht-value">{last24h.length}</span>
        </article>
        <article className="ht-stat">
          <span className="ht-label">Active Now</span>
          <span className="ht-value">{active.length}</span>
        </article>
        <article className="ht-stat">
          <span className="ht-label">7d Total Estimated Loss</span>
          <span className="ht-value">{usd(total7dLoss)}</span>
        </article>
        <article className="ht-stat">
          <span className="ht-label">Snapshot</span>
          <span className="ht-value">{now.toISOString().slice(11, 16)} UTC</span>
        </article>
      </section>

      <section className="ht-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Live Ticker</h2>
          <span className="ht-chip">Last 24 Hours</span>
        </div>
        <div className="ht-list">
          {last24h.slice(0, 14).map((row) => {
            const label = taxonomyLabel({
              incidentType: row.incidentType,
              ruleHits: row.ruleHits,
              ruleSummary: row.ruleSummary,
            });
            return (
              <Link key={row.id.toString()} href={`/incidents/${row.id.toString()}`} className="ht-list-row">
                <span>{label}</span>
                <span>{chainName(row.chainId)}</span>
                <span>{usd(Number(row.estimatedTotalLossUsd ?? 0))}</span>
                <span className="ht-text-muted">{ago(row.updatedAt)}</span>
              </Link>
            );
          })}
          {last24h.length === 0 && <div className="ht-text-muted">No incidents in the last 24 hours.</div>}
        </div>
      </section>

      <section className="ht-row two">
        <article className="ht-panel alt">
          <h2 style={{ marginTop: 0 }}>Active Incidents</h2>
          <div className="ht-list">
            {active.slice(0, 10).map((row) => {
              const label = taxonomyLabel({
                incidentType: row.incidentType,
                ruleHits: row.ruleHits,
                ruleSummary: row.ruleSummary,
              });
              return (
                <Link key={row.id.toString()} href={`/incidents/${row.id.toString()}`} className="ht-list-row">
                  <span>{label}</span>
                  <span>{chainName(row.chainId)}</span>
                  <span>score {row.score}</span>
                  <span className="ht-text-muted">{ago(row.updatedAt)}</span>
                </Link>
              );
            })}
            {active.length === 0 && <div className="ht-text-muted">No active incidents.</div>}
          </div>
        </article>

        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Largest This Week</h2>
          {biggestThisWeek ? (
            <div className="ht-row">
              <div className="ht-mini-grid two">
                <div>
                  <div className="ht-label">Incident</div>
                  <div>
                    <Link href={`/incidents/${biggestThisWeek.id.toString()}`}>
                      {biggestThisWeek.id.toString()}
                    </Link>
                  </div>
                </div>
                <div>
                  <div className="ht-label">Chain</div>
                  <div>{chainName(biggestThisWeek.chainId)}</div>
                </div>
              </div>
              <div>
                <div className="ht-label">Peak Loss</div>
                <div className="ht-value">{usd(Number(biggestThisWeek.peakLossUsd ?? 0))}</div>
              </div>
              <div className="ht-text-muted">Updated {ago(biggestThisWeek.updatedAt)}</div>
            </div>
          ) : (
            <div className="ht-text-muted">No incidents this week.</div>
          )}
        </article>
      </section>

      <section className="ht-row two">
        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Exploit Vector Distribution (7d)</h2>
          <div className="ht-mini-grid">
            {vectorRows.map(([label, count]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{label}</span>
                <strong>{count}</strong>
              </div>
            ))}
            {vectorRows.length === 0 && <div className="ht-text-muted">No data.</div>}
          </div>
        </article>

        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Chains Affected (7d)</h2>
          <div className="ht-mini-grid">
            {chainRows.map(([chainId, count]) => (
              <div key={chainId} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{chainName(chainId)}</span>
                <strong>{count}</strong>
              </div>
            ))}
            {chainRows.length === 0 && <div className="ht-text-muted">No data.</div>}
          </div>
        </article>
      </section>
    </PublicTrackerShell>
  );
}
