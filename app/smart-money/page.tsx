"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  href?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
  active: number;
};

type LeaderItem = {
  chainId: number;
  chainName: string;
  wallet: string;
  window: string;
  score: number;
  features: Record<string, unknown>;
  updatedAt: string;
};

export default function SmartMoneyLeaderboard() {
  const sections: NavSection[] = [
    {
      title: "Capital & Behavior",
      items: [
        { label: "Smart Money Tracker", href: "/smart-money-tracker" },
        { label: "Smart Money Leaderboard", href: "/smart-money" },
        { label: "Wallet Profiler" },
        { label: "Cross-Chain Flows" },
      ],
      active: 1,
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
    {
      title: "Narrative Insights",
      items: [
        { label: "Sentiment Analysis" },
        { label: "Narrative Trends" },
        { label: "Dev Activity" },
      ],
      active: -1,
    },
    {
      title: "Catalyst Events",
      items: [{ label: "Unlock Calendar" }, { label: "Governance Watch" }],
      active: -1,
    },
  ];

  const [chainId, setChainId] = useState<string>("");
  const [window, setWindow] = useState("30d");
  const [minScore, setMinScore] = useState("70");
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (chainId) params.set("chain", chainId);
    if (window) params.set("window", window);
    if (minScore) params.set("minScore", minScore);
    params.set("limit", "50");
    return params.toString();
  }, [chainId, window, minScore]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/smart-money/top?${queryString}`);
        const data = (await res.json()) as { items?: LeaderItem[] };
        setItems(data.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [queryString]);

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
              <div className="title">Smart Money Leaderboard</div>
              <div className="actions">{loading ? "Syncing" : "Live"}</div>
            </div>
            <div className="filter-row">
              <div className="filter-group">
                <label>Chain</label>
                <select value={chainId} onChange={(event) => setChainId(event.target.value)}>
                  <option value="">All</option>
                  <option value="1">Ethereum</option>
                  <option value="42161">Arbitrum</option>
                  <option value="8453">Base</option>
                  <option value="56">BNB Chain</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Window</label>
                <select value={window} onChange={(event) => setWindow(event.target.value)}>
                  <option value="30d">30d</option>
                  <option value="7d">7d</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Min score</label>
                <input
                  value={minScore}
                  onChange={(event) => setMinScore(event.target.value)}
                  type="number"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            <div className="list">
              {items.length === 0 ? (
                <div className="list-item">
                  <span>No scored wallets yet. Run analytics to populate scores.</span>
                </div>
              ) : (
                items.map((item) => (
                  <div key={`${item.chainId}-${item.wallet}`} className="list-item">
                    <div>
                      <strong>{item.chainName}</strong>
                      <div className="meta">{item.wallet}</div>
                    </div>
                    <div className="meta">Score {item.score}</div>
                    <Link className="btn" href={`/wallet/${item.wallet}`}>
                      View
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}