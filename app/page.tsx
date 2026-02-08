import Link from "next/link";
import { IncidentLifecycleState, IncidentType, Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { chainName } from "@/services/exploit-tracker/public-intel";
import { getPublicStatusSnapshot } from "@/services/exploit-tracker/public-status";
import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

const ALLOWED_TYPES: IncidentType[] = [
  IncidentType.WALLET_DRAIN,
  IncidentType.PROTOCOL_EXPLOIT,
  IncidentType.BRIDGE_EXPLOIT,
];

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function shortAddr(value: string) {
  const v = value.trim();
  if (!isAddress(v)) return v;
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

function ago(date: Date) {
  const delta = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(delta / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function usdVerified(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Pending verification";
  return `$${Math.round(value).toLocaleString()}`;
}

function confidenceLabel(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  if (v >= 0.8) return "High";
  if (v >= 0.55) return "Medium";
  return "Low";
}

function exploitLabel(t: IncidentType) {
  if (t === IncidentType.WALLET_DRAIN) return "Wallet Drainer";
  if (t === IncidentType.BRIDGE_EXPLOIT) return "Bridge Exploit";
  return "Protocol Exploit";
}

function summarySnippet(row: {
  incidentType: IncidentType;
  affectedContracts: string[];
  victimAddresses: string[];
  topTxHashes: string[];
}) {
  const contracts = row.affectedContracts.length;
  const victims = row.victimAddresses.length;
  const txs = row.topTxHashes.length;
  if (row.incidentType === IncidentType.WALLET_DRAIN) {
    return `Rapid outflow cluster detected. Victims: ${victims || "?"} • Contracts: ${contracts || "?"} • Evidence txs: ${txs || "?"}`;
  }
  if (row.incidentType === IncidentType.BRIDGE_EXPLOIT) {
    return `Bridge anomaly detected. Contracts: ${contracts || "?"} • Evidence txs: ${txs || "?"}`;
  }
  return `Contract outflow anomaly detected. Contracts: ${contracts || "?"} • Evidence txs: ${txs || "?"}`;
}

function parseMulti(params: SearchParams, key: string) {
  const raw = params[key];
  if (!raw) return [] as string[];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function hrefWith(params: SearchParams, updates: Record<string, string | string[] | null>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, item);
    } else {
      sp.append(k, v);
    }
  }

  for (const [k, v] of Object.entries(updates)) {
    sp.delete(k);
    if (v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) sp.append(k, item);
    } else {
      sp.append(k, v);
    }
  }

  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}

async function buildProtocolNameByPrimaryContract(rows: Array<{ chainId: number; primaryContract: string | null }>) {
  const ors = rows
    .filter((r) => r.primaryContract && isAddress(r.primaryContract))
    .map((r) => ({
      chainId: r.chainId,
      address: r.primaryContract!.toLowerCase(),
    }));

  if (ors.length === 0) return new Map<string, string>();

  const links = await prisma.protocolContract.findMany({
    where: { OR: ors },
    include: { protocol: true },
    take: 1000,
  });

  const map = new Map<string, string>();
  for (const link of links) {
    map.set(`${link.chainId}:${link.address.toLowerCase()}`, link.protocol.name);
  }
  return map;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  const rangeKey = (pick("range") ?? "24h").toLowerCase();
  const rangeMs =
    rangeKey === "30d" ? 30 * 24 * 60 * 60 * 1000 : rangeKey === "7d" ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const viewKey = (pick("view") ?? "all").toLowerCase(); // all | active | largest
  const sortKey = (pick("sort") ?? "recent").toLowerCase(); // recent | loss | confidence
  const groupDuplicates = (pick("group") ?? "1") !== "0";

  const chainFilters = parseMulti(params, "chain")
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);

  const typeFilters = parseMulti(params, "type")
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean)
    .map((v) => (v === "WALLET_DRAINER" ? "WALLET_DRAIN" : v))
    .filter((v) => v === "WALLET_DRAIN" || v === "PROTOCOL_EXPLOIT" || v === "BRIDGE_EXPLOIT") as IncidentType[];

  const selectedTypes = typeFilters.length > 0 ? typeFilters : ALLOWED_TYPES;

  const now = new Date();
  const sinceRange = new Date(now.getTime() - rangeMs);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baseWhere: Prisma.IncidentWhereInput = {
    publicVisible: true,
    tenant: { publicFeedEnabled: true },
    incidentType: { in: selectedTypes },
    ...(chainFilters.length > 0 ? { chainId: { in: chainFilters } } : {}),
  };

  const orderBy: Prisma.IncidentOrderByWithRelationInput[] =
    sortKey === "loss"
      ? [{ peakLossUsd: "desc" }, { updatedAt: "desc" }]
      : sortKey === "confidence"
        ? [{ exploitConfidence: "desc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }, { id: "desc" }];

  const [snapshot, activeCount, new24hCount, verified7dSum, largest7d, feedSeed, chartSeed] = await Promise.all([
    getPublicStatusSnapshot(),
    prisma.incident.count({
      where: {
        ...baseWhere,
        lifecycleState: { in: [IncidentLifecycleState.OPEN, IncidentLifecycleState.EXPANDING] },
      },
    }),
    prisma.incident.count({ where: { ...baseWhere, createdAt: { gte: since24h } } }),
    prisma.incident.aggregate({
      where: { ...baseWhere, startedAt: { gte: since7d }, peakLossUsd: { gt: 0 } },
      _sum: { peakLossUsd: true },
    }),
    prisma.incident.findFirst({
      where: { ...baseWhere, startedAt: { gte: since7d }, peakLossUsd: { gt: 0 } },
      orderBy: [{ peakLossUsd: "desc" }, { updatedAt: "desc" }],
      take: 1,
    }),
    prisma.incident.findMany({
      where: {
        ...baseWhere,
        ...(viewKey === "active"
          ? { lifecycleState: { in: [IncidentLifecycleState.OPEN, IncidentLifecycleState.EXPANDING] } }
          : {}),
        ...(viewKey === "largest" ? { peakLossUsd: { gt: 0 } } : {}),
        updatedAt: { gte: sinceRange },
      },
      orderBy: viewKey === "largest" ? [{ peakLossUsd: "desc" }, { updatedAt: "desc" }] : orderBy,
      take: 300,
    }),
    prisma.incident.findMany({
      where: { ...baseWhere, updatedAt: { gte: sinceRange } },
      select: { chainId: true, incidentType: true, rootKey: true, peakLossUsd: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 2000,
    }),
  ]);

  const verified7dLoss = Number(verified7dSum._sum.peakLossUsd ?? 0);

  const feedRows = (() => {
    const rows = feedSeed.slice();
    if (!groupDuplicates) return rows.slice(0, 120);
    const seen = new Set<string>();
    const out: typeof rows = [];
    for (const r of rows) {
      if (seen.has(r.rootKey)) continue;
      seen.add(r.rootKey);
      out.push(r);
      if (out.length >= 120) break;
    }
    return out;
  })();

  const primaryContracts = feedRows.map((row) => ({
    chainId: row.chainId,
    primaryContract: row.affectedContracts[0] ?? (isAddress(row.projectKey ?? "") ? row.projectKey : null),
  }));
  if (largest7d) {
    primaryContracts.push({
      chainId: largest7d.chainId,
      primaryContract: largest7d.affectedContracts[0] ?? (isAddress(largest7d.projectKey ?? "") ? largest7d.projectKey : null),
    });
  }

  const protocolByKey = await buildProtocolNameByPrimaryContract(primaryContracts);

  const chainOptions =
    snapshot.chains.length > 0
      ? snapshot.chains.map((c) => ({ chainId: c.chainId, label: c.chain }))
      : (
          await prisma.incident.groupBy({
            by: ["chainId"],
            where: baseWhere,
            orderBy: { chainId: "asc" },
          })
        ).map((r) => ({ chainId: r.chainId, label: chainName(r.chainId) }));

  const lastIngestAt = (() => {
    const times = snapshot.chains.map((c) => c.lastEventAt).filter(Boolean) as string[];
    if (times.length === 0) return null;
    times.sort();
    return times[times.length - 1] ?? null;
  })();
  const approxLagBlocks = (() => {
    const lags = snapshot.chains.map((c) => c.lagBlocks).filter((v): v is number => typeof v === "number" && v >= 0);
    if (lags.length === 0) return null;
    const max = Math.max(...lags);
    return Number.isFinite(max) ? max : null;
  })();

  const chartRows = (() => {
    const seen = new Set<string>();
    const out: typeof chartSeed = [];
    for (const r of chartSeed) {
      if (groupDuplicates && seen.has(r.rootKey)) continue;
      seen.add(r.rootKey);
      out.push(r);
    }
    return out;
  })();

  const totalChart = chartRows.length;
  const countByType = new Map<IncidentType, number>();
  const countByChain = new Map<number, number>();
  const lossByType = new Map<IncidentType, number>();

  for (const r of chartRows) {
    countByType.set(r.incidentType, (countByType.get(r.incidentType) ?? 0) + 1);
    countByChain.set(r.chainId, (countByChain.get(r.chainId) ?? 0) + 1);
    const loss = Number(r.peakLossUsd ?? 0);
    if (Number.isFinite(loss) && loss > 0) {
      lossByType.set(r.incidentType, (lossByType.get(r.incidentType) ?? 0) + loss);
    }
  }

  const typeDist = selectedTypes
    .map((t) => ({ type: t, count: countByType.get(t) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  const chainDist = Array.from(countByChain.entries())
    .map(([chainId, count]) => ({ chainId, count }))
    .sort((a, b) => b.count - a.count);

  const topLossByType = Array.from(lossByType.entries())
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <PublicTrackerShell
      activeNav="overview"
      title="Hack Tracker"
      subtitle="What’s moving on-chain right now, what’s verified, and what still needs confirmation."
    >
      <p className="ht-helper">
        Incidents are behaviorally clustered on-chain events. Loss figures appear only after verification and update as funds move.
      </p>

      <section className="ht-row four">
        <article className="ht-stat">
          <div className="ht-stat-head">
            <span className="ht-label">Active Incidents</span>
            <span className="ht-tip" title="Incidents currently open or expanding.">i</span>
          </div>
          <span className="ht-value">{activeCount}</span>
          <div className="ht-text-muted">open or expanding</div>
        </article>
        <article className="ht-stat">
          <div className="ht-stat-head">
            <span className="ht-label">New in 24h</span>
            <span className="ht-tip" title="Incidents created in the last 24 hours.">i</span>
          </div>
          <span className="ht-value">{new24hCount}</span>
          <div className="ht-text-muted">created in last 24h</div>
        </article>
        <article className="ht-stat">
          <div className="ht-stat-head">
            <span className="ht-label">7d Verified Loss</span>
            <span className="ht-tip" title="Sum of confirmed on-chain losses. Pending incidents do not contribute.">i</span>
          </div>
          <span className="ht-value">{verified7dLoss > 0 ? usdVerified(verified7dLoss) : "Loss verification in progress"}</span>
          <div className="ht-text-muted">confirmed on-chain</div>
        </article>
        <article className="ht-stat">
          <div className="ht-stat-head">
            <span className="ht-label">Coverage Snapshot</span>
            <span className="ht-tip" title="Tracked chains and ingestion freshness computed from observed events and cursors.">i</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>
            Chains: {snapshot.chains.length} • Last ingest:{" "}
            {lastIngestAt ? lastIngestAt.slice(11, 16) + " UTC" : "unknown"} • Lag:{" "}
            {approxLagBlocks === null ? "unknown" : `~${approxLagBlocks} blocks`}
          </div>
        </article>
      </section>

      <section className="ht-panel ht-controls">
        <form method="GET" className="ht-controls-inner">
          <div className="ht-controls-row">
            <div className="ht-field">
              <label>Time range</label>
              <div className="ht-seg">
                {(["24h", "7d", "30d"] as const).map((k) => (
                  <label key={k} className={rangeKey === k ? "ht-seg-item active" : "ht-seg-item"}>
                    <input type="radio" name="range" value={k} defaultChecked={rangeKey === k} />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div className="ht-field">
              <label>Chains</label>
              <div className="ht-pill-row">
                {chainOptions.map((c) => (
                  <label key={c.chainId} className="ht-pill">
                    <input type="checkbox" name="chain" value={String(c.chainId)} defaultChecked={chainFilters.includes(c.chainId)} />
                    {c.label}
                  </label>
                ))}
                {chainOptions.length === 0 && <div className="ht-text-muted">Tracking chains: none detected yet.</div>}
              </div>
            </div>

            <div className="ht-field">
              <label>Exploit type</label>
              <div className="ht-pill-row">
                {ALLOWED_TYPES.map((t) => (
                  <label key={t} className="ht-pill">
                    <input type="checkbox" name="type" value={t} defaultChecked={selectedTypes.includes(t)} />
                    {exploitLabel(t)}
                  </label>
                ))}
              </div>
            </div>

            <div className="ht-field">
              <label htmlFor="sort">Sort by</label>
              <select className="ht-select" id="sort" name="sort" defaultValue={sortKey}>
                <option value="recent">Most recent</option>
                <option value="loss">Highest verified loss</option>
                <option value="confidence">Highest confidence</option>
              </select>
            </div>

            <div className="ht-field">
              <label>Options</label>
              <label className="ht-check">
                <input type="checkbox" name="group" value="1" defaultChecked={groupDuplicates} />
                Group duplicates
              </label>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <button type="submit" className="ht-button">
              Apply
            </button>
            <Link href="/" className="ht-link-button">
              Reset
            </Link>
            <span className="ht-text-muted">Confidence is based on multi-signal alignment and evolves as evidence accumulates.</span>
          </div>
        </form>
      </section>

      <section className="ht-panel">
        <div className="ht-feed-head">
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Incident Feed</h2>
            <div className="ht-text-muted">Window: {rangeKey.toUpperCase()} • Showing public incidents only</div>
          </div>
          <div className="ht-tabs" aria-label="Feed views">
            <Link href={hrefWith(params, { view: "all" })} className={viewKey === "all" ? "ht-tab-link active" : "ht-tab-link"}>
              All
            </Link>
            <Link href={hrefWith(params, { view: "active" })} className={viewKey === "active" ? "ht-tab-link active" : "ht-tab-link"}>
              Active
            </Link>
            <Link href={hrefWith(params, { view: "largest", sort: "loss" })} className={viewKey === "largest" ? "ht-tab-link active" : "ht-tab-link"}>
              Largest
            </Link>
          </div>
        </div>

        <div className="ht-card-list">
          {feedRows.map((row) => {
            const primaryContract = row.affectedContracts[0] ?? (isAddress(row.projectKey ?? "") ? row.projectKey : null);
            const protocolName =
              primaryContract && protocolByKey.get(`${row.chainId}:${primaryContract.toLowerCase()}`)
                ? protocolByKey.get(`${row.chainId}:${primaryContract.toLowerCase()}`)!
                : "Unknown Protocol";

            const protocolDetail = protocolName === "Unknown Protocol" && primaryContract ? shortAddr(primaryContract) : "";
            const verifiedLoss = Number(row.peakLossUsd ?? 0);
            const lossText = verifiedLoss > 0 ? usdVerified(verifiedLoss) : "Loss: Pending verification";
            const conf = Number(row.exploitConfidence ?? 0);
            const confText = confidenceLabel(conf);

            return (
              <Link key={row.id.toString()} href={`/incidents/${row.id.toString()}`} className="ht-incident-card">
                <div className="ht-incident-left">
                  <span className="ht-badge">{exploitLabel(row.incidentType)}</span>
                  <span className="ht-badge soft">{chainName(row.chainId)}</span>
                </div>

                <div className="ht-incident-center">
                  <div className="ht-protocol">
                    <strong>{protocolName}</strong>
                    {protocolDetail ? <span className="ht-protocol-detail">{protocolDetail}</span> : null}
                  </div>
                  <div className="ht-snippet">{summarySnippet(row)}</div>
                </div>

                <div className="ht-incident-right">
                  <div className="ht-loss">{lossText}</div>
                  <div className="ht-meta">
                    <span title="Confidence is based on multi-signal alignment and evolves as evidence accumulates.">
                      Confidence: {confText}
                    </span>
                    <span className="ht-text-muted">Updated {ago(row.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}

          {feedRows.length === 0 && (
            <div className="ht-empty">
              <div>No incidents in the last {rangeKey.toUpperCase()}.</div>
              <div className="ht-text-muted">Loss verification in progress or no public incidents match this filter set.</div>
              <div style={{ marginTop: 8 }}>
                <Link href="/methodology" className="ht-link-button">
                  View methodology
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="ht-row two">
        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Exploit Type Distribution ({rangeKey.toUpperCase()})</h2>
          <div className="ht-mini-grid">
            {typeDist.map((row) => {
              const pct = totalChart > 0 ? Math.round((row.count / totalChart) * 100) : 0;
              return (
                <Link
                  key={row.type}
                  href={hrefWith(params, { type: [row.type] })}
                  className="ht-dist-row"
                  title="Click to filter the feed by this exploit type."
                >
                  <span>{exploitLabel(row.type)}</span>
                  <span className="ht-text-muted">
                    {row.count} • {pct}%
                  </span>
                </Link>
              );
            })}
            {totalChart === 0 && <div className="ht-text-muted">No data in this window.</div>}
          </div>

          {topLossByType.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="ht-label">Top verified loss by exploit type</div>
              <div className="ht-mini-grid">
                {topLossByType.map((row) => (
                  <div key={row.type} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{exploitLabel(row.type)}</span>
                    <strong>{usdVerified(row.total)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="ht-panel">
          <h2 style={{ marginTop: 0 }}>Chains Affected ({rangeKey.toUpperCase()})</h2>
          <div className="ht-mini-grid">
            {chainDist.map((row) => {
              const pct = totalChart > 0 ? Math.round((row.count / totalChart) * 100) : 0;
              return (
                <Link
                  key={row.chainId}
                  href={hrefWith(params, { chain: [String(row.chainId)] })}
                  className="ht-dist-row"
                  title="Click to filter the feed by this chain."
                >
                  <span>{chainName(row.chainId)}</span>
                  <span className="ht-text-muted">
                    {row.count} • {pct}%
                  </span>
                </Link>
              );
            })}
            {chainDist.length === 0 && <div className="ht-text-muted">No data in this window.</div>}
          </div>
        </article>
      </section>

      <section className="ht-panel alt">
        <h2 style={{ marginTop: 0 }}>Largest This Week</h2>
        {largest7d ? (
          <div className="ht-largest">
            <div className="ht-largest-main">
              <div className="ht-chip">{exploitLabel(largest7d.incidentType)}</div>
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>
                {(() => {
                  const primaryContract =
                    largest7d.affectedContracts[0] ?? (isAddress(largest7d.projectKey ?? "") ? largest7d.projectKey : null);
                  const protocolName =
                    primaryContract && protocolByKey.get(`${largest7d.chainId}:${primaryContract.toLowerCase()}`)
                      ? protocolByKey.get(`${largest7d.chainId}:${primaryContract.toLowerCase()}`)!
                      : "Unknown Protocol";
                  const detail = protocolName === "Unknown Protocol" && primaryContract ? ` (${shortAddr(primaryContract)})` : "";
                  return `${protocolName}${detail}`;
                })()}
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                <div className="ht-value">{usdVerified(Number(largest7d.peakLossUsd ?? 0))}</div>
                <div className="ht-text-muted">
                  {chainName(largest7d.chainId)} • Updated {ago(largest7d.updatedAt)}
                </div>
              </div>
            </div>
            <Link href={`/incidents/${largest7d.id.toString()}`} className="ht-link-button">
              View incident
            </Link>
          </div>
        ) : (
          <div className="ht-text-muted">
            No verified incidents in the last 7d. <Link href="/methodology">Methodology</Link>
          </div>
        )}
      </section>
    </PublicTrackerShell>
  );
}
