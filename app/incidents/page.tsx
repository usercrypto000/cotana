import Link from "next/link";
import { IncidentLifecycleState, Prisma } from "@prisma/client";
import { prisma } from "@/services/prisma";
import { chainName, taxonomyLabel } from "@/services/exploit-tracker/public-intel";
import {
  parseArchiveMonthFilter,
  parseChainFilter,
  parseHistoricalFilter,
  parseIncidentTypeFilter,
  parseLiveFilter,
} from "@/services/exploit-tracker/public-api";
import { PublicTrackerShell } from "@/app/_components/PublicTrackerShell";

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams: Promise<SearchParams> };

type ArchiveRow = {
  month_key: string;
  item_count: bigint;
};

export const dynamic = "force-dynamic";

function parseSeries(raw: unknown) {
  if (!Array.isArray(raw)) return [] as number[];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const v = Number((item as any).confidence ?? 0);
      return Number.isFinite(v) ? v : null;
    })
    .filter((value): value is number => value !== null)
    .slice(-20);
}

function sparkline(values: number[]) {
  if (values.length === 0) return "M0 20 L100 20";
  const points = values.map((value, idx) => {
    const x = (idx / Math.max(values.length - 1, 1)) * 100;
    const y = 20 - Math.max(0, Math.min(1, value)) * 18;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${points.join(" L")}`;
}

export default async function IncidentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  };

  const liveOnly = parseLiveFilter(pick("live"));
  const historical = parseHistoricalFilter(pick("historical"));
  const chainId = parseChainFilter(pick("chain"));
  const incidentType = parseIncidentTypeFilter(pick("type"));
  const protocol = (pick("protocol") ?? "").trim();
  const archiveMonth = parseArchiveMonthFilter(pick("archive"));

  const where: Prisma.IncidentWhereInput = {
    publicVisible: true,
    tenant: { publicFeedEnabled: true },
    incidentType: {
      in: ["WALLET_DRAIN", "PROTOCOL_EXPLOIT", "BRIDGE_EXPLOIT", "LP_EXPLOIT"],
    },
    lifecycleState: { not: IncidentLifecycleState.FALSE_POSITIVE },
    ...(liveOnly
      ? {
          lifecycleState: {
            in: [
              IncidentLifecycleState.OPEN,
              IncidentLifecycleState.EXPANDING,
              IncidentLifecycleState.CONTAINED,
            ],
          },
        }
      : {}),
    ...(historical === null ? {} : { historical }),
    ...(chainId ? { chainId } : {}),
    ...(incidentType ? { incidentType } : {}),
    ...(archiveMonth
      ? {
          startedAt: {
            gte: archiveMonth.start,
            lt: archiveMonth.end,
          },
        }
      : {}),
    ...(protocol
      ? {
          OR: [
            { projectKey: { contains: protocol, mode: "insensitive" as const } },
            { ruleSummary: { contains: protocol, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      ruleHits: { orderBy: { createdAt: "desc" }, take: 20 },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const [chainRows, archiveRows] = await Promise.all([
    prisma.incident.groupBy({
      by: ["chainId"],
      where: {
        publicVisible: true,
        tenant: { publicFeedEnabled: true },
        incidentType: { in: ["WALLET_DRAIN", "PROTOCOL_EXPLOIT", "BRIDGE_EXPLOIT", "LP_EXPLOIT"] },
        lifecycleState: { not: IncidentLifecycleState.FALSE_POSITIVE },
      },
      orderBy: { chainId: "asc" },
    }),
    prisma.$queryRaw<ArchiveRow[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', started_at), 'YYYY-MM') AS month_key,
        COUNT(*)::bigint AS item_count
      FROM incidents
      WHERE
        public_visible = true
        AND incident_type IN ('WALLET_DRAIN','PROTOCOL_EXPLOIT','BRIDGE_EXPLOIT','LP_EXPLOIT')
        AND lifecycle_state <> 'FALSE_POSITIVE'
        AND EXISTS (
          SELECT 1 FROM tenants t WHERE t.id = incidents.tenant_id AND t.public_feed_enabled = true
        )
      GROUP BY DATE_TRUNC('month', started_at)
      ORDER BY DATE_TRUNC('month', started_at) DESC
      LIMIT 36
    `,
  ]);

  return (
    <PublicTrackerShell
      activeNav="incidents"
      title="Incident Archive"
      subtitle="Filter, inspect, and pivot through active and historical exploit cases."
    >
      <section className="ht-panel">
        <form method="GET">
          <div className="ht-form-grid">
            <div className="ht-field">
              <label htmlFor="protocol">Protocol</label>
              <input
                className="ht-input"
                id="protocol"
                name="protocol"
                defaultValue={protocol}
                placeholder="protocol/address"
              />
            </div>

            <div className="ht-field">
              <label htmlFor="chain">Chain</label>
              <select className="ht-select" id="chain" name="chain" defaultValue={chainId ? String(chainId) : ""}>
                <option value="">All</option>
                {chainRows.map((row) => (
                  <option key={row.chainId} value={row.chainId}>
                    {chainName(row.chainId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="ht-field">
              <label htmlFor="type">Exploit Type</label>
              <select className="ht-select" id="type" name="type" defaultValue={incidentType ?? ""}>
                <option value="">All</option>
                <option value="WALLET_DRAIN">Wallet Drainer</option>
                <option value="PROTOCOL_EXPLOIT">Protocol Exploit</option>
                <option value="BRIDGE_EXPLOIT">Bridge Exploit</option>
                <option value="LP_EXPLOIT">LP Exploit</option>
              </select>
            </div>

            <div className="ht-field">
              <label htmlFor="historical">Historical</label>
              <select
                className="ht-select"
                id="historical"
                name="historical"
                defaultValue={historical === null ? "" : String(historical)}
              >
                <option value="">All</option>
                <option value="false">Live</option>
                <option value="true">Historical</option>
              </select>
            </div>

            <div className="ht-field">
              <label htmlFor="archive">Archive Month</label>
              <select className="ht-select" id="archive" name="archive" defaultValue={archiveMonth?.key ?? ""}>
                <option value="">All months</option>
                {archiveRows.map((row) => (
                  <option key={row.month_key} value={row.month_key}>
                    {row.month_key} ({Number(row.item_count)})
                  </option>
                ))}
              </select>
            </div>

            <div className="ht-field">
              <label htmlFor="live">Live Only</label>
              <select className="ht-select" id="live" name="live" defaultValue={liveOnly ? "true" : ""}>
                <option value="">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <button type="submit" className="ht-button">
              Apply
            </button>
            <Link href="/incidents" className="ht-link-button">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="ht-table-wrap">
        <table className="ht-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Label</th>
              <th>Chain</th>
              <th>Lifecycle</th>
              <th>Score</th>
              <th>Confidence</th>
              <th>Verified Loss (USD)</th>
              <th>Historical</th>
              <th>Archive</th>
              <th>Trend</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => {
              const series = parseSeries(incident.confidenceOverTime);
              const label = taxonomyLabel({
                incidentType: incident.incidentType,
                ruleHits: incident.ruleHits,
                ruleSummary: incident.ruleSummary,
              }) ?? "-";

              const verifiedLoss = Number(incident.peakLossUsd ?? 0);
              const verifiedLossCell =
                Number.isFinite(verifiedLoss) && verifiedLoss > 0
                  ? `$${Math.round(verifiedLoss).toLocaleString()}`
                  : "Pending verification";

              return (
                <tr key={incident.id.toString()}>
                  <td>
                    <Link href={`/incidents/${incident.id.toString()}`}>{incident.id.toString()}</Link>
                  </td>
                  <td>{label}</td>
                  <td>{chainName(incident.chainId)}</td>
                  <td>{incident.lifecycleState}</td>
                  <td>{incident.score}</td>
                  <td>{(Number(incident.exploitConfidence ?? 0) * 100).toFixed(1)}%</td>
                  <td>{verifiedLossCell}</td>
                  <td>{incident.historical ? `yes (${incident.detectedVia})` : "no"}</td>
                  <td>{incident.startedAt.toISOString().slice(0, 7)}</td>
                  <td>
                    <svg className="ht-spark" viewBox="0 0 100 22" aria-hidden>
                      <path d={sparkline(series)} fill="none" stroke="#111" strokeWidth="1.8" />
                    </svg>
                  </td>
                  <td>{incident.updatedAt.toISOString()}</td>
                </tr>
              );
            })}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={11} className="ht-text-muted">
                  No incidents match this filter set.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </PublicTrackerShell>
  );
}
