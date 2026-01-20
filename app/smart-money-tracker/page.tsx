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

type SmartMoneyItem = {
  chainId: number;
  chainName: string;
  type: "native" | "erc20" | "deploy";
  txHash: string;
  blockNumber: number;
  timestamp: number | null;
  from?: string | null;
  to?: string | null;
  tokenSymbol?: string;
  tokenAddress?: string;
  amount?: string;
  valueUsd?: number;
  detail: string;
  isFresh?: boolean;
};

const chainIds = [1, 42161, 8453, 56];

export default function SmartMoneyTrackerPage() {
  const sections: NavSection[] = [
    {
      title: "Capital & Behavior",
      items: [
        { label: "Smart Money Tracker", href: "/smart-money-tracker" },
        { label: "Wallet Profiler" },
        { label: "Cross-Chain Flows" },
      ],
      active: 0,
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

  const [smartMoneyItems, setSmartMoneyItems] = useState<SmartMoneyItem[]>([]);
  const [smartMoneyLoading, setSmartMoneyLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("chains", chainIds.join(","));
    params.set("minUsd", "50000");
    params.set("blocks", "60");
    params.set("native", "true");
    params.set("erc20", "true");
    params.set("fresh", "false");
    params.set("deployers", "true");
    params.set("limit", "30");
    return params.toString();
  }, []);

  async function fetchSmartMoney() {
    setSmartMoneyLoading(true);
    try {
      const res = await fetch(`/api/smart-money?${queryString}`);
      const data = (await res.json()) as { items?: SmartMoneyItem[]; updatedAt?: string };
      setSmartMoneyItems(data.items ?? []);
      setLastUpdated(data.updatedAt ?? null);
    } catch {
      setSmartMoneyItems([]);
      setLastUpdated(null);
    } finally {
      setSmartMoneyLoading(false);
    }
  }

  useEffect(() => {
    fetchSmartMoney();
    const timer = setInterval(fetchSmartMoney, 20000);
    return () => clearInterval(timer);
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
          <div className="nav-section">
            <h4>Investigation Desk</h4>
            <div className="nav-item">
              <span className="nav-dot" />
              Investigation Desk
            </div>
          </div>
        </aside>

        <main className="content">
          <div className="tracker-header">
            <h2 className="tracker-title">Smart Money Tracker</h2>
            <span className="tracker-status">{smartMoneyLoading ? "Syncing" : "Live"}</span>
          </div>
          <div className="subhead">
            Recent Activity{lastUpdated ? ` as of ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
          </div>
          <div className="list">
            {smartMoneyItems.length === 0 ? (
              <div className="list-item">
                <span>No matches yet. Try lowering the USD threshold.</span>
              </div>
            ) : (
              smartMoneyItems.map((item) => (
                <div key={`${item.txHash}-${item.type}`} className="list-item">
                  <div>
                    <strong>{item.chainName}</strong>
                    <div className="meta">{item.detail}</div>
                  </div>
                  <span className={`badge ${item.type === "deploy" ? "warning" : "positive"}`}>
                    {item.valueUsd ? `$${item.valueUsd.toFixed(0)}` : item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
