import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicIncidentById } from "@/services/exploit-tracker/public-api";
import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim() ||
    "http://localhost:3000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function usd(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Pending verification";
  return `$${Math.round(value).toLocaleString()}`;
}

function shortAddr(value: string) {
  const v = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  let incidentId: bigint;
  try {
    incidentId = BigInt(id);
  } catch {
    return { title: "Incident Not Found" };
  }

  const item = await getPublicIncidentById(incidentId);
  if (!item) return { title: "Incident Not Found" };

  const title = `${item.taxonomyLabel} | Loss: ${usd(item.peakLossUsd)} | ${item.chain}`;
  const description = item.summary.split("\n")[0] ?? item.summary;
  const url = `${siteUrl()}/incidents/${item.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function IncidentDetailPage({ params }: Params) {
  const { id } = await params;
  let incidentId: bigint;
  try {
    incidentId = BigInt(id);
  } catch {
    notFound();
  }

  const incident = await getPublicIncidentById(incidentId);
  if (!incident) notFound();

  const protocolLine = (() => {
    const hint = (incident.protocolHint ?? "").trim();
    if (!hint) return { label: "Unknown Protocol", detail: "" };
    if (/^0x[a-fA-F0-9]{40}$/.test(hint)) {
      return { label: "Unknown Protocol", detail: `(${shortAddr(hint)})` };
    }
    return { label: hint, detail: "" };
  })();

  return (
    <PublicTrackerShell
      activeNav="incidents"
      title={`Incident ${incident.id}`}
      subtitle="Structured incident evidence, deterministic narrative, and traceable timeline links."
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div className="ht-chip">{incident.taxonomyLabel}</div>
        <Link className="ht-back-link" href="/incidents">
          Back to incidents
        </Link>
      </div>

      <section className="ht-panel">
        <div className="ht-row four">
          <div>
            <span className="ht-label">Protocol</span>
            <div>
              {protocolLine.label} {protocolLine.detail}
            </div>
          </div>
          <div><span className="ht-label">Chain</span><div>{incident.chain}</div></div>
          <div><span className="ht-label">Lifecycle</span><div>{incident.lifecycleState}</div></div>
          <div><span className="ht-label">Status</span><div>{incident.status}</div></div>
          <div><span className="ht-label">Detected Via</span><div>{incident.detectedVia}</div></div>
          <div><span className="ht-label">Score</span><div>{incident.score}</div></div>
          <div><span className="ht-label">Confidence</span><div>{(incident.confidence * 100).toFixed(1)}%</div></div>
          <div><span className="ht-label">Verified Loss</span><div>{usd(incident.peakLossUsd)}</div></div>
          <div><span className="ht-label">Historical</span><div>{incident.historical ? "yes" : "no"}</div></div>
          <div><span className="ht-label">Started</span><div>{incident.startedAt}</div></div>
          <div><span className="ht-label">Last Updated</span><div>{incident.lastUpdatedAt}</div></div>
        </div>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Incident Summary</h2>
        <textarea readOnly value={incident.summary} className="ht-code" />
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Confidence Explanation</h2>
        <p style={{ margin: 0 }}>{incident.confidenceExplanation}</p>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Timeline</h2>
        <div className="ht-timeline">
          {incident.timeline.map((entry, idx) => (
            <div key={`${entry.at}-${idx}`} className="ht-timeline-item">
              <div className="ht-label">{entry.at}</div>
              <strong>{entry.title}</strong>
              <div>{entry.detail}</div>
              <div className="ht-links">
                {entry.txLinks.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer">
                    tx
                  </a>
                ))}
                {entry.addressLinks.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer">
                    address
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ht-row two">
        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Top Transactions</h2>
          <div className="ht-list">
            {incident.linkedTxs.map((tx) => (
              <a key={tx.txHash} href={tx.url} target="_blank" rel="noreferrer" className="ht-list-row">
                <span>{tx.txHash}</span>
              </a>
            ))}
          </div>
        </article>

        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Involved Addresses</h2>
          <div className="ht-list">
            {incident.linkedAddresses.map((addr) => (
              <a key={addr.address} href={addr.url} target="_blank" rel="noreferrer" className="ht-list-row">
                <span>{addr.address}</span>
              </a>
            ))}
          </div>
        </article>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Fund-Flow Paths</h2>
        <div className="ht-table-wrap">
          <table className="ht-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Sink</th>
                <th>Hops</th>
                <th>Input</th>
                <th>Output</th>
                <th>Conservation</th>
              </tr>
            </thead>
            <tbody>
              {incident.fundFlowPaths.map((path) => (
                <tr key={path.id}>
                  <td>{path.sourceAddress}</td>
                  <td>{path.sinkAddress}</td>
                  <td>{path.hopCount}</td>
                  <td>{path.totalInputUsd.toFixed(2)}</td>
                  <td>{path.totalOutputUsd.toFixed(2)}</td>
                  <td>{path.conservationRatio.toFixed(4)}</td>
                </tr>
              ))}
              {incident.fundFlowPaths.length === 0 && (
                <tr>
                  <td colSpan={6} className="ht-text-muted">
                    No fund-flow paths recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PublicTrackerShell>
  );
}
