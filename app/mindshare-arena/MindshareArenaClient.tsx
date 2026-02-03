"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import useSWR from "swr";

type ProtocolSummary = {
  id: string;
  name: string;
  chain: string;
  category: string;
  uaw: number;
  visits: number;
  change: number;
  speed: "fast" | "slow";
  momentum: number;
  spark: number[];
};

type WalletSummary = {
  id: string;
  label: string;
  change: number;
  interactions: number;
  breadth: number;
  intensity: "High" | "Medium" | "Low";
  score: number;
  protocols: string[];
};

type MindshareSummary = {
  window: "24h" | "7d" | "30d";
  rangeLabel: string;
  totals: {
    uaw: number;
    visits: number;
    protocols: number;
    coverage: number;
  };
  protocols: ProtocolSummary[];
  wallets: WalletSummary[];
};

type ProtocolMetricRow = {
  id: string;
  name: string;
  chainId: number;
  asOf: string;
  uawAttributed: number;
  uawDirect: number;
  uawEvent: number;
  eoaUaw: number;
  swUaw: number;
  repeatRate: number;
  medianActionsPerWallet: number;
  valueMovedUsd: number | null;
  score: number | null;
  prevScore: number | null;
  prevUaw: number | null;
};

type ProtocolsResponse = {
  window: string;
  sort: string;
  data: ProtocolMetricRow[];
};

type WindowKey = "24h" | "7d" | "30d";

type TimeframeTab = {
  id: string;
  label: string;
  value?: WindowKey;
  enabled: boolean;
};

const timeframes: TimeframeTab[] = [
  { id: "24h", label: "24h", value: "24h", enabled: true },
  { id: "48h", label: "48h", enabled: false },
  { id: "7d", label: "7d", value: "7d", enabled: true },
  { id: "30d", label: "30d", value: "30d", enabled: true },
  { id: "90d", label: "90d", enabled: false },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load mindshare data");
  }
  return (await res.json()) as MindshareSummary;
};

const protoFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load protocols");
  return (await res.json()) as ProtocolsResponse;
};

const formatChange = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const formatCompact = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
};

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

const demoProtocols: ProtocolSummary[] = [
  {
    id: "demo-arbitrum",
    name: "Arbitrum",
    chain: "Ethereum",
    category: "L2",
    uaw: 42900,
    visits: 310000,
    change: 137.5,
    speed: "fast",
    momentum: 2.6,
    spark: [12, 18, 26, 34, 44, 52, 60, 68, 74],
  },
  {
    id: "demo-sanko",
    name: "Sanko",
    chain: "Ethereum",
    category: "Social",
    uaw: 19800,
    visits: 122000,
    change: 106.9,
    speed: "fast",
    momentum: 2.2,
    spark: [8, 10, 14, 22, 32, 46, 56, 63, 69],
  },
  {
    id: "demo-monad",
    name: "Monad",
    chain: "Testnet",
    category: "L1",
    uaw: 25100,
    visits: 178000,
    change: 81.6,
    speed: "fast",
    momentum: 1.9,
    spark: [14, 12, 16, 20, 28, 36, 44, 52, 60],
  },
  {
    id: "demo-zerolend",
    name: "ZeroLend",
    chain: "Base",
    category: "Lending",
    uaw: 12400,
    visits: 96000,
    change: 36.3,
    speed: "slow",
    momentum: 1.2,
    spark: [18, 17, 19, 22, 24, 26, 28, 30, 32],
  },
  {
    id: "demo-morpho",
    name: "Morpho",
    chain: "Ethereum",
    category: "Lending",
    uaw: 9700,
    visits: 84000,
    change: -17.4,
    speed: "slow",
    momentum: 0.9,
    spark: [22, 20, 19, 18, 16, 15, 14, 13, 12],
  },
  {
    id: "demo-eigen",
    name: "EigenLayer",
    chain: "Ethereum",
    category: "Restaking",
    uaw: 18100,
    visits: 140000,
    change: 44.1,
    speed: "slow",
    momentum: 1.4,
    spark: [20, 22, 24, 26, 27, 29, 30, 32, 34],
  },
  {
    id: "demo-gearbox",
    name: "Gearbox",
    chain: "Ethereum",
    category: "Lending",
    uaw: 7400,
    visits: 52000,
    change: -8.8,
    speed: "slow",
    momentum: 0.8,
    spark: [18, 17, 16, 14, 13, 12, 11, 10, 9],
  },
  {
    id: "demo-pancake",
    name: "PancakeSwap",
    chain: "BSC",
    category: "DEX",
    uaw: 21300,
    visits: 180000,
    change: -6.2,
    speed: "slow",
    momentum: 0.9,
    spark: [26, 25, 24, 23, 22, 21, 20, 20, 19],
  },
];

const trendClass = (change: number, speed: ProtocolSummary["speed"]) => {
  if (change >= 0 && speed === "fast") return "trend-up-fast";
  if (change >= 0 && speed === "slow") return "trend-up-slow";
  if (change < 0 && speed === "fast") return "trend-down-fast";
  return "trend-down-slow";
};

const momentumLabel = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  return `${value.toFixed(1)}x`;
};

export default function MindshareArenaClient() {
  const [timeframe, setTimeframe] = useState<WindowKey>("24h");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("cotana-theme") as
      | "light"
      | "dark"
      | null;
    const nextTheme = stored ?? "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("cotana-theme", next);
  };

  const { data, error, isLoading } = useSWR<MindshareSummary>(
    `/api/mindshare/summary?window=${timeframe}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const protocolWindowParam = timeframe === "24h" ? "1d" : timeframe;
  const { data: protoData } = useSWR<ProtocolsResponse>(
    `/api/mindshare/protocols?window=${protocolWindowParam}`,
    protoFetcher,
    { revalidateOnFocus: false }
  );

  const protocolData = useMemo(() => {
    const rows = protoData?.data ?? [];
    if (rows.length === 0) return demoProtocols;
    return rows.map((row, idx) => {
      const score = row.score ?? 0;
      const prev = row.prevScore ?? 0;
      const change = prev > 0 ? ((score - prev) / prev) * 100 : 0;
      const momentum = prev > 0 ? score / prev : 1;
      return {
        id: row.id,
        name: row.name,
        chain: `Chain ${row.chainId}`,
        category: "Protocol",
        uaw: row.uawAttributed,
        visits: row.uawDirect ?? row.uawAttributed,
        change,
        speed: Math.abs(change) >= 25 ? "fast" : "slow",
        momentum,
        spark: [],
      } as ProtocolSummary;
    });
  }, [protoData]);

  const wallets = data?.wallets ?? [];
  const totals = data?.totals ?? { uaw: 0, visits: 0, protocols: 0, coverage: 0 };
  const timeframeLabel = data?.rangeLabel ?? "Last 24 hours";

  const { gainers, losers, leader } = useMemo(() => {
    if (!protocolData.length) {
      return { gainers: [], losers: [], leader: undefined as ProtocolSummary | undefined };
    }
    const sorted = [...protocolData].sort((a, b) => b.change - a.change);
    const topGainers = sorted.filter((item) => item.change > 0).slice(0, 10);
    const topLosers = [...sorted]
      .reverse()
      .filter((item) => item.change < 0)
      .slice(0, 10);
    return { gainers: topGainers, losers: topLosers, leader: protocolData[0] };
  }, [protocolData]);

  return (
    <div className="mindshare-shell">
      <section className="mindshare-hero-banner">
        <div className="mindshare-hero-content">
          <span className="mindshare-kicker">Cotana Mindshare Arena</span>
          <h1>Tracking explosive, rising and emerging pre-TGE onchain protocols</h1>
          <p>
            Cotana surfaces protocol momentum and wallet mindshare from onchain activity.
            This arena highlights pre-TGE protocols before the broader market catches on.
          </p>
          <div className="mindshare-hero-stats">
            <div>
              <span>Total UAW</span>
              <strong>{formatCompact(totals.uaw)}</strong>
            </div>
            <div>
              <span>Total visits</span>
              <strong>{formatCompact(totals.visits)}</strong>
            </div>
            <div>
              <span>Protocols tracked</span>
              <strong>{formatCompact(totals.protocols)}</strong>
            </div>
            <div>
              <span>Coverage</span>
              <strong>{totals.coverage ? `${totals.coverage} chains` : "--"}</strong>
            </div>
          </div>
          {error ? (
            <div className="small-note">
              {error instanceof Error ? error.message : "Failed to load"}
            </div>
          ) : null}
        </div>
        <button
          className="theme-toggle mindshare-theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <svg className="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg className="theme-icon moon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" />
            </svg>
          )}
        </button>
        <div className="mindshare-hero-visual" aria-hidden="true" />
      </section>

      <section className="mindshare-arena-shell">
        <div className="mindshare-arena-header">
          <div>
            <h2>Pre-TGE Mindshare Arena</h2>
            <p>{timeframeLabel}</p>
          </div>
          <div className="mindshare-arena-actions">
            <button className="pill-button" type="button">
              See Points Arena
            </button>
            <div className="timeframe-tabs">
              {timeframes.map((item) => (
                <button
                  key={item.id}
                  className={`timeframe-tab${item.value === timeframe ? " active" : ""}`}
                  onClick={() => (item.enabled && item.value ? setTimeframe(item.value) : null)}
                  disabled={!item.enabled}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mindshare-arena-layout">
          <aside className="mindshare-side">
            <div className="mindshare-list-card">
              <div className="mindshare-list-head">
                <strong>Top Gainers</strong>
                <span>Last {timeframe}</span>
              </div>
              <div className="mindshare-list-body">
                {gainers.length === 0 ? (
                  <span className="small-note">No gainers yet.</span>
                ) : (
                gainers.map((item, index) => (
                  <a
                    key={item.id}
                    className="mindshare-list-row"
                    href={`/mindshare-arena/protocol/${encodeURIComponent(item.id)}?window=${timeframe}`}
                  >
                    <span className="mindshare-list-label">
                      <span className="mindshare-list-rank">{index + 1}</span>
                      <span className="mindshare-list-icon gain" aria-hidden="true" />
                      {item.name}
                    </span>
                    <em className="positive">{formatChange(item.change)}</em>
                  </a>
                ))
                )}
              </div>
            </div>

            <div className="mindshare-list-card">
              <div className="mindshare-list-head">
                <strong>Top Losers</strong>
                <span>Last {timeframe}</span>
              </div>
              <div className="mindshare-list-body">
                {losers.length === 0 ? (
                  <span className="small-note">No losers yet.</span>
                ) : (
                losers.map((item, index) => (
                  <a
                    key={item.id}
                    className="mindshare-list-row"
                    href={`/mindshare-arena/protocol/${encodeURIComponent(item.id)}?window=${timeframe}`}
                  >
                    <span className="mindshare-list-label">
                      <span className="mindshare-list-rank">{index + 1}</span>
                      <span className="mindshare-list-icon loss" aria-hidden="true" />
                      {item.name}
                    </span>
                    <em className="danger">{formatChange(item.change)}</em>
                  </a>
                ))
                )}
              </div>
            </div>
          </aside>

          <div className="mindshare-grid-area">
            <div className="mindshare-grid">
              {isLoading && protocolData.length === 0 ? (
                <div className="small-note">Loading arena data...</div>
              ) : (
                protocolData.map((protocol, index) => {
                  const trend = trendClass(protocol.change, protocol.speed);
                  const delay = `${index * 0.05}s`;
                  return (
                    <a
                      key={protocol.id}
                      className={`mindshare-tile ${trend}${index === 0 ? " featured" : ""}`}
                      href={`/mindshare-arena/protocol/${encodeURIComponent(protocol.id)}?window=${timeframe}`}
                      style={{ "--delay": delay } as CSSProperties}
                    >
                      <div className="mindshare-tile-header">
                        <div className="mindshare-tile-title">
                          <div className="mindshare-title-row">
                            <span className="mindshare-rank-inline">{index + 1}</span>
                            <strong>{protocol.name}</strong>
                          </div>
                          <span className="mindshare-tile-change">
                            {formatChange(protocol.change)}
                          </span>
                          <span className="mindshare-tile-meta">{protocol.category}</span>
                        </div>
                        <div className="mindshare-tile-badges">
                          {index < 3 ? (
                            <span className="mindshare-crown" aria-hidden="true">
                              {index + 1}
                            </span>
                          ) : (
                            <span className="mindshare-rank-pill">{index + 1}</span>
                          )}
                        </div>
                      </div>
                      <div className="mindshare-tile-spark">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polyline points={sparkPoints(protocol.spark)} />
                        </svg>
                      </div>
                      <div className="mindshare-tile-footer">
                        <span>Momentum {momentumLabel(protocol.momentum)}</span>
                        <span>{formatCompact(protocol.uaw)} UAW</span>
                      </div>
                    </a>
                  );
                })
              )}
            </div>

            <div className="mindshare-wallets">
              <div className="mindshare-wallets-head">
                <div>
                  <strong>Top Wallets</strong>
                  <span>by Mindshare</span>
                </div>
                <button className="pill-button ghost" type="button">
                  Show All
                </button>
              </div>
              <div className="mindshare-wallets-table">
                <div className="wallet-row header">
                  <span>Wallet</span>
                  <span>Activity</span>
                  <span>Mindshare</span>
                  <span>Interactions</span>
                </div>
                {wallets.length === 0 ? (
                  <div className="small-note">No wallet activity yet.</div>
                ) : (
                  wallets.map((wallet) => (
                    <a
                      key={wallet.id}
                      className="wallet-row link"
                      href={`/mindshare-arena/wallet/${encodeURIComponent(wallet.id)}?window=${timeframe}`}
                    >
                      <span className="wallet-label">{wallet.label}</span>
                      <span className="wallet-change">{formatChange(wallet.change)}</span>
                      <span className="wallet-bar">
                        <span style={{ width: `${wallet.score}%` }} />
                      </span>
                      <span>{wallet.interactions}</span>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="mindshare-bottom-nav" aria-label="Primary">
        <a href="/incentives">Incentives Radar</a>
        <a href="/mindshare-arena" className="active">
          Mindshare Arena
        </a>
        <span>Star Charts</span>
        <span>Alerts</span>
      </nav>

      <footer className="mindshare-footer">Copyright Cotana 2026</footer>
    </div>
  );
}
