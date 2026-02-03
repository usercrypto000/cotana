import { notFound } from "next/navigation";
import { getProtocolDetail, isMindshareEnabled, resolveMindshareWindow } from "@/services/mindshare";

type ProtocolPageProps = {
  params: { dex: string };
  searchParams?: { window?: string };
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);

const formatChange = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const momentumLabel = (value: number) => `${value.toFixed(1)}x`;

const sparkPoints = (values: number[]) => {
  if (!values.length) return "0,50";
  if (values.length === 1) return "0,50";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

export default async function ProtocolPage({ params, searchParams }: ProtocolPageProps) {
  if (!isMindshareEnabled()) {
    notFound();
  }

  const window = resolveMindshareWindow(searchParams?.window);
  const detail = await getProtocolDetail(params.dex, window);

  if (!detail) {
    notFound();
  }

  const lastSeenLabel = detail.lastSeen
    ? new Date(detail.lastSeen * 1000).toLocaleString()
    : "No activity yet";

  return (
    <div className="app-shell mindshare-shell">
      <header className="topbar topbar-solid mindshare-topbar">
        <div className="brand">
          <span className="brand-mark" />
          Cotana
        </div>
        <div className="mindshare-topbar-center">
          <span className="mindshare-topbar-label">Mindshare Arena</span>
          <span className="small-note">Protocol view</span>
        </div>
        <div className="mindshare-topbar-actions">
          <span className="mindshare-pill">Future expansion</span>
          <a className="btn secondary" href={`/mindshare-arena?window=${window}`}>
            Back to Arena
          </a>
        </div>
      </header>

      <div className="shell-body no-sidebar">
        <main className="content mindshare-page mindshare-detail">
          <section className="card mindshare-detail-hero">
            <div>
              <div className="hero-brand">Protocol</div>
              <h1 className="hero-title">{detail.name}</h1>
              <p className="hero-subtitle">
                {detail.category} - {detail.chain} - {detail.rangeLabel}
              </p>
              <div className="small-note">Last seen: {lastSeenLabel}</div>
            </div>
            <div className="mindshare-detail-stats">
              <div className="detail-stat">
                <span>UAW</span>
                <strong>{formatCompact(detail.uaw)}</strong>
              </div>
              <div className="detail-stat">
                <span>Visits</span>
                <strong>{formatCompact(detail.visits)}</strong>
              </div>
              <div className="detail-stat">
                <span>Momentum</span>
                <strong>{momentumLabel(detail.momentum)}</strong>
              </div>
              <div className="detail-stat">
                <span>Change</span>
                <strong>{formatChange(detail.change)}</strong>
              </div>
            </div>
          </section>

          <section className="detail-grid">
            <article className="card">
              <div className="card-header">
                <span className="title">Top interacting wallets</span>
              </div>
              <ul className="detail-list">
                {detail.topWallets.length === 0 ? (
                  <li className="small-note">No wallets yet.</li>
                ) : (
                  detail.topWallets.map((wallet) => (
                    <li key={wallet.address} className="mindshare-detail-row">
                      <span>{wallet.label}</span>
                      <strong>{wallet.interactions ?? 0} interactions</strong>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="card">
              <div className="card-header">
                <span className="title">Interaction breakdown</span>
              </div>
              <div className="detail-metrics">
                <div>
                  <span>Visits</span>
                  <strong>{formatCompact(detail.visits)}</strong>
                </div>
                <div>
                  <span>Unique wallets</span>
                  <strong>{formatCompact(detail.uaw)}</strong>
                </div>
                <div>
                  <span>Chains</span>
                  <strong>{detail.chains}</strong>
                </div>
              </div>
            </article>

            <article className="card">
              <div className="card-header">
                <span className="title">Mindshare timeline</span>
              </div>
              <div className="arena-spark">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline points={sparkPoints(detail.spark)} />
                </svg>
              </div>
              <div className="small-note">{detail.rangeLabel} swap activity</div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}



