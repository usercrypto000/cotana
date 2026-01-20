"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type NavItem = {
  label: string;
  href?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
  active: number;
};

type WalletSummary = {
  wallet: string;
  positions: Array<{
    chainId: number;
    chainName: string;
    token: string;
    symbol: string;
    balanceDec: string;
  }>;
  pnl: Array<{
    chainId: number;
    chainName: string;
    token: string;
    symbol: string;
    realizedPnlUsd30d: string;
    realizedPnlUsdAll: string;
    winTrades30d: number;
    lossTrades30d: number;
  }>;
  scores: Array<{
    chainId: number;
    chainName: string;
    score: number;
    window: string;
  }>;
  labels: Array<{
    label: string;
    category: string;
    confidence: string;
    source: string;
  }>;
};

type TradeItem = {
  chainId: number;
  chainName: string;
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountInDec: string;
  amountOutDec: string;
  symbolIn: string;
  symbolOut: string;
  timestamp: number;
};

export default function WalletPage() {
  const params = useParams();
  const address = typeof params?.address === "string" ? params.address : "";

  const sections: NavSection[] = [
    {
      title: "Capital & Behavior",
      items: [
        { label: "Smart Money Tracker", href: "/smart-money-tracker" },
        { label: "Smart Money Leaderboard", href: "/smart-money" },
        { label: "Wallet Profiler", href: address ? `/wallet/${address}` : undefined },
        { label: "Cross-Chain Flows" },
      ],
      active: 2,
    },
    {
      title: "Protocol Monitoring",
      items: [
        { label: "Contract Alerts" },
        { label: "Token Supply Watch" },
        { label: "Liquidity Health" },
      ],
      active: -1,
    },
  ];

  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("window", "30d");
    return params.toString();
  }, []);

  useEffect(() => {
    if (!address) return;
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, tradesRes] = await Promise.all([
          fetch(`/api/wallet/${address}/summary?${queryString}`),
          fetch(`/api/wallet/${address}/trades?limit=20`),
        ]);
        const summaryData = (await summaryRes.json()) as WalletSummary;
        const tradesData = (await tradesRes.json()) as { items?: TradeItem[] };
        setSummary(summaryData);
        setTrades(tradesData.items ?? []);
      } catch {
        setSummary(null);
        setTrades([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [address, queryString]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Cotana
        </div>
        <div className="searchbar">
          <span className="search-icon" aria-hidden="true" />
          <input placeholder="Search wallet, contract, or query..." />
        </div>
        <div className="top-actions">
          <button className="action" type="button">
            Alerts
          </button>
          <button className="action" type="button">
            Saved Reports
          </button>
          <span className="action">Sync</span>
          <span className="action">Settings</span>
          <span className="avatar" aria-hidden="true" />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          {sections.map((section) => (
            <div key={section.title} className="nav-section">
              <h4>{section.title}</h4>
              {section.items.map((item, index) => {
                const isActive = section.active === index;
                const className = `nav-item ${isActive ? "active" : ""}`;
                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} className={className}>
                      <span className="nav-dot" />
                      {item.label}
                    </Link>
                  );
                }
                return (
                  <div key={item.label} className={className}>
                    <span className="nav-dot" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>

        <main className="content">
          <section className="card">
            <div className="card-header">
              <div className="title">Wallet Overview</div>
              <div className="actions">{loading ? "Syncing" : "Live"}</div>
            </div>
            <div className="list">
              <div className="list-item">
                <span className="meta">Address</span>
                <span>{summary?.wallet ?? address}</span>
              </div>
              <div className="list-item">
                <span className="meta">Labels</span>
                <span>
                  {summary?.labels?.length
                    ? summary.labels.map((label) => `${label.label} (${label.category})`).join(", ")
                    : "Unlabeled"}
                </span>
              </div>
              <div className="list-item">
                <span className="meta">Score</span>
                <span>{summary?.scores?.[0]?.score ?? "�"}</span>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div className="title">Token Positions</div>
              <div className="actions">Updated</div>
            </div>
            <div className="list">
              {summary?.positions?.length ? (
                summary.positions.slice(0, 10).map((pos) => (
                  <div key={`${pos.chainId}-${pos.token}`} className="list-item">
                    <span>{pos.symbol}</span>
                    <span>{pos.balanceDec}</span>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <span>No positions yet.</span>
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div className="title">Recent Trades</div>
              <div className="actions">Last 20</div>
            </div>
            <div className="list">
              {trades.length ? (
                trades.map((trade) => (
                  <div key={trade.txHash} className="list-item">
                    <div>
                      <strong>{trade.chainName}</strong>
                      <div className="meta">
                        {trade.amountInDec} {trade.symbolIn} -> {trade.amountOutDec} {trade.symbolOut}
                      </div>
                    </div>
                    <span className="meta">{new Date(trade.timestamp * 1000).toLocaleTimeString()}</span>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <span>No trades yet.</span>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}