import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicIncidentById } from "@/services/exploit-tracker/public-api";
import { addressUrl } from "@/services/exploit-tracker/public-intel";
import { prisma } from "@/services/prisma";
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

function confidenceLabel(value: number) {
  if (!Number.isFinite(value)) return "Low";
  if (value >= 0.8) return "High";
  if (value >= 0.55) return "Medium";
  return "Low";
}

function exploitLabel(value: string) {
  const v = value.toUpperCase();
  if (v === "WALLET_DRAIN") return "Wallet Drainer";
  if (v === "BRIDGE_EXPLOIT") return "Bridge Exploit";
  return "Protocol Exploit";
}

function signalBadge(params: { lifecycleState: string; status: string; peakLossUsd: number }) {
  const lifecycle = params.lifecycleState.toUpperCase();
  const status = params.status.toUpperCase();

  if (lifecycle === "FALSE_POSITIVE") {
    return { tone: "resolved" as const, label: "RESOLVED \u2014 No Exploit" as const };
  }
  if (lifecycle === "RESOLVED" || status === "RESOLVED") {
    return { tone: "resolved" as const, label: "RESOLVED \u2014 No Exploit" as const };
  }
  if (Number.isFinite(params.peakLossUsd) && params.peakLossUsd > 0) {
    return { tone: "confirmed" as const, label: "CONFIRMED \u2014 Loss Verified" as const };
  }
  return { tone: "live" as const, label: "LIVE \u2014 Investigating" as const };
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function txHashFromUrl(url: string) {
  const idx = url.lastIndexOf("/tx/");
  if (idx === -1) return null;
  const hash = url.slice(idx + 4).trim();
  return /^0x[a-fA-F0-9]{64}$/.test(hash) ? hash : null;
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

  const badge = signalBadge({
    lifecycleState: item.lifecycleState,
    status: item.status,
    peakLossUsd: item.peakLossUsd,
  });
  const title = `${badge.label} | ${exploitLabel(String(item.incidentType))} | ${item.chain}`;
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

  const badge = signalBadge({
    lifecycleState: incident.lifecycleState,
    status: incident.status,
    peakLossUsd: incident.peakLossUsd,
  });

  const primaryContract =
    incident.affectedContracts[0] ??
    (/^0x[a-fA-F0-9]{40}$/.test(String(incident.protocolHint ?? "")) ? String(incident.protocolHint) : null);

  const protocolName = await (async () => {
    if (!primaryContract) return "Unknown Protocol";
    const link = await prisma.protocolContract.findFirst({
      where: { chainId: incident.chainId, address: primaryContract.toLowerCase() },
      include: { protocol: true },
    });
    return link?.protocol?.name ?? "Unknown Protocol";
  })();

  const protocolDetail =
    protocolName === "Unknown Protocol" && primaryContract ? `(${shortAddr(primaryContract)})` : "";

  const verifiedLossText =
    Number.isFinite(incident.peakLossUsd) && incident.peakLossUsd > 0
      ? usd(incident.peakLossUsd)
      : "Pending verification";

  const confidenceText = confidenceLabel(Number(incident.confidence ?? 0));

  const summaryText = (() => {
    const contracts = incident.affectedContracts.length;
    const attackers = incident.attackerAddresses.length;
    const victims = incident.victimAddresses.length;
    const hasCashout = incident.cashoutPaths.length > 0;

    if (badge.tone === "confirmed") {
      return `On-chain activity was clustered as a ${exploitLabel(String(incident.incidentType))}. Loss is verified and evidence links below are traceable.`;
    }

    if (badge.tone === "resolved") {
      return `This signal has been resolved. Evidence did not support an active exploit at the time of last update.`;
    }

    const parts = [
      `Suspicious activity was detected and clustered as a potential ${exploitLabel(String(incident.incidentType)).toLowerCase()}.`,
      `Investigation is ongoing and losses are not yet verified.`,
      `Observed scope: ${contracts || "?"} contract(s), ${attackers || "?"} attacker address(es), ${victims || "?"} victim address(es).`,
      hasCashout ? `Cashout attempts have been observed.` : `Cashout activity is still under analysis.`,
    ];
    return parts.join(" ");
  })();

  const timelineTxs = uniq(
    incident.timeline.flatMap((entry) => entry.txLinks.map((url) => txHashFromUrl(url) ?? "")).filter(Boolean)
  ).slice(0, 80);

  const txMeta = await (async () => {
    if (timelineTxs.length === 0) return new Map<string, { block: string | null; at: string | null }>();
    const rows = await prisma.transferEvent.findMany({
      where: { chainId: incident.chainId, txHash: { in: timelineTxs } },
      select: { txHash: true, blockNumber: true, blockTimestamp: true },
      orderBy: [{ blockNumber: "asc" }],
      take: 4000,
    });
    const map = new Map<string, { block: string | null; at: string | null }>();
    for (const r of rows) {
      const k = r.txHash.toLowerCase();
      if (map.has(k)) continue;
      map.set(k, {
        block: r.blockNumber ? r.blockNumber.toString() : null,
        at: r.blockTimestamp ? r.blockTimestamp.toISOString() : null,
      });
    }
    return map;
  })();

  return (
    <PublicTrackerShell
      activeNav="incidents"
      title="Incident Report"
      subtitle="What is confirmed, what is under investigation, and the evidence supporting each step."
    >
      <section className="ht-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className={`ht-badge status ${badge.tone}`}>{badge.label}</span>
              <span className="ht-badge">{exploitLabel(String(incident.incidentType))}</span>
              <span className="ht-badge soft">{incident.chain}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
                {protocolName} {protocolDetail}
              </div>
              <div className="ht-text-muted">Incident ID: {incident.id}</div>
            </div>
            <div className="ht-mini-grid three">
              <div>
                <div className="ht-label">First detected</div>
                <div>{incident.startedAt}</div>
              </div>
              <div>
                <div className="ht-label">Last updated</div>
                <div>{incident.lastUpdatedAt}</div>
              </div>
              <div>
                <div className="ht-label">Verified loss</div>
                <div>{verifiedLossText}</div>
              </div>
            </div>
          </div>
          <Link className="ht-back-link" href="/incidents">
            Back to incidents
          </Link>
        </div>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <p style={{ margin: 0, lineHeight: 1.7 }}>{summaryText}</p>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Key Facts</h2>
        <div className="ht-mini-grid three">
          <div>
            <div className="ht-label">Status</div>
            <div>{badge.tone === "live" ? "Investigating" : badge.tone === "confirmed" ? "Confirmed" : "Resolved"}</div>
          </div>
          <div>
            <div className="ht-label">Exploit type</div>
            <div>{exploitLabel(String(incident.incidentType))}</div>
          </div>
          <div>
            <div className="ht-label">Chain</div>
            <div>{incident.chain}</div>
          </div>
          <div>
            <div className="ht-label">Verified loss</div>
            <div>{verifiedLossText}</div>
          </div>
          <div>
            <div className="ht-label">Confidence</div>
            <div title="Confidence is based on multi-signal alignment and evolves as evidence accumulates.">
              {confidenceText}
            </div>
          </div>
          <div>
            <div className="ht-label">Incident ID</div>
            <div style={{ fontFamily: "var(--font-mono)" }}>{incident.id}</div>
          </div>
        </div>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Actors & Addresses</h2>
        <div className="ht-row two">
          <article className="ht-panel alt">
            <h3 style={{ marginTop: 0 }}>Protocol Contract</h3>
            {incident.affectedContracts.length > 0 ? (
              <div className="ht-list">
                {incident.affectedContracts.slice(0, 1).map((addr) => (
                  <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                    <span>Protocol Contract:</span>
                    <span title={addr}>{shortAddr(addr)}</span>
                  </a>
                ))}
                {incident.affectedContracts.length > 1 && (
                  <details>
                    <summary className="ht-text-muted">+{incident.affectedContracts.length - 1} more</summary>
                    <div className="ht-list" style={{ marginTop: 8 }}>
                      {incident.affectedContracts.slice(1, 20).map((addr) => (
                        <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                          <span>Protocol Contract:</span>
                          <span title={addr}>{shortAddr(addr)}</span>
                        </a>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="ht-text-muted">Protocol contract not identified yet.</div>
            )}
          </article>

          <article className="ht-panel alt">
            <h3 style={{ marginTop: 0 }}>Hacker Wallet</h3>
            {incident.attackerAddresses.length > 0 ? (
              <div className="ht-list">
                {incident.attackerAddresses.slice(0, 3).map((addr) => (
                  <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                    <span>Hacker Wallet:</span>
                    <span title={addr}>{shortAddr(addr)}</span>
                  </a>
                ))}
                {incident.attackerAddresses.length > 3 && (
                  <details>
                    <summary className="ht-text-muted">+{incident.attackerAddresses.length - 3} more</summary>
                    <div className="ht-list" style={{ marginTop: 8 }}>
                      {incident.attackerAddresses.slice(3, 30).map((addr) => (
                        <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                          <span>Hacker Wallet:</span>
                          <span title={addr}>{shortAddr(addr)}</span>
                        </a>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ) : (
              <div className="ht-text-muted">No attacker wallet identified yet.</div>
            )}
          </article>
        </div>

        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Victim Wallet</h3>
          {incident.victimAddresses.length > 0 ? (
            <div className="ht-list">
              {incident.victimAddresses.slice(0, 5).map((addr) => (
                <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                  <span>Victim Wallet:</span>
                  <span title={addr}>{shortAddr(addr)}</span>
                </a>
              ))}
              {incident.victimAddresses.length > 5 && (
                <details>
                  <summary className="ht-text-muted">+{incident.victimAddresses.length - 5} more</summary>
                  <div className="ht-list" style={{ marginTop: 8 }}>
                    {incident.victimAddresses.slice(5, 40).map((addr) => (
                      <a key={addr} href={addressUrl(incident.chainId, addr)} target="_blank" rel="noreferrer" className="ht-list-row">
                        <span>Victim Wallet:</span>
                        <span title={addr}>{shortAddr(addr)}</span>
                      </a>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div className="ht-text-muted">Victim wallets not identified yet.</div>
          )}
        </div>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Evidence Timeline</h2>
        <div className="ht-timeline">
          {incident.timeline.map((entry, idx) => (
            <div key={`${entry.at}-${idx}`} className="ht-timeline-item">
              <div className="ht-label">{entry.at}</div>
              <strong>{entry.title}</strong>
              <div>{entry.detail}</div>
              <div className="ht-links">
                {entry.txLinks.map((link) => {
                  const hash = txHashFromUrl(link);
                  const meta = hash ? txMeta.get(hash.toLowerCase()) : null;
                  const label = hash ? shortAddr(hash) : "tx";
                  const blockText = meta?.block ? `block ${meta.block}` : "block -";
                  return (
                    <a key={link} href={link} target="_blank" rel="noreferrer" title={hash ?? link}>
                      {label} ({blockText})
                    </a>
                  );
                })}
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

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Fund Movement</h2>
        {incident.cashoutPaths.length > 0 ? (
          <div className="ht-mini-grid">
            {incident.cashoutPaths.slice(0, 6).map((p) => (
              <div key={p.id} style={{ display: "grid", gap: 4, padding: 10, border: "1px solid var(--ht-border)", borderRadius: 12, background: "var(--ht-panel)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{p.pathType}</strong>
                  <span className="ht-text-muted">{usd(Number(p.totalUsd ?? 0))}</span>
                </div>
                <div className="ht-text-muted">{p.summary}</div>
              </div>
            ))}
          </div>
        ) : incident.fundFlowPaths.length > 0 ? (
          <div className="ht-mini-grid">
            {incident.fundFlowPaths.slice(0, 6).map((path) => (
              <div key={path.id} style={{ display: "grid", gap: 6, padding: 10, border: "1px solid var(--ht-border)", borderRadius: 12, background: "var(--ht-panel)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>Flow</strong>
                  <span className="ht-text-muted">{path.hopCount} hops</span>
                </div>
                <div className="ht-text-muted">
                  Source: <span title={path.sourceAddress}>{shortAddr(path.sourceAddress)}</span> {"->"} Sink:{" "}
                  <span title={path.sinkAddress}>{shortAddr(path.sinkAddress)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ht-text-muted">Fund movement under analysis.</div>
        )}
      </section>

      <section className="ht-panel alt">
        <h2 style={{ marginTop: 0 }}>Verification & Confidence</h2>
        <div className="ht-mini-grid two">
          <div>
            <div className="ht-label">What raised confidence</div>
            <div style={{ lineHeight: 1.7 }}>
              {incident.attackerAddresses.length > 0 ? "Multiple linked attacker addresses. " : ""}
              {incident.affectedContracts.length > 0 ? "Contract outflow patterns tied to protocol contracts. " : ""}
              {incident.cashoutPaths.length > 0 ? "Cashout behavior observed. " : ""}
              {incident.timeline.length > 0 ? "Repeated evidence events over time." : ""}
            </div>
          </div>
          <div>
            <div className="ht-label">What is still missing</div>
            <div style={{ lineHeight: 1.7 }}>
              {Number.isFinite(incident.peakLossUsd) && incident.peakLossUsd > 0
                ? "Loss is verified."
                : "Verified on-chain loss is still pending; values remain conservative until verified."}
            </div>
          </div>
        </div>
      </section>

      <section className="ht-panel">
        <h2 style={{ marginTop: 0 }}>Helpful Links</h2>
        <div className="ht-links">
          <Link href="/methodology">Methodology</Link>
          <Link href="/status">Status</Link>
          {primaryContract ? (
            <a href={addressUrl(incident.chainId, primaryContract)} target="_blank" rel="noreferrer">
              Explorer (protocol contract)
            </a>
          ) : null}
        </div>
      </section>
    </PublicTrackerShell>
  );
}
