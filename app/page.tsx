"use client";

import { useEffect, useMemo, useState } from "react";

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

export default function Home() {
  const sections = [
    {
      title: "Capital & Behavior",
      items: ["Smart Money Tracker", "Wallet Profiler", "Cross-Chain Flows"],
      active: 0,
    },
    {
      title: "Protocol Monitoring",
      items: ["Contract Alerts", "Token Supply Watch", "Liquidity Health"],
      active: -1,
    },
    {
      title: "Narrative Insights",
      items: ["Sentiment Analysis", "Narrative Trends", "Dev Activity"],
      active: -1,
    },
    {
      title: "Catalyst Events",
      items: ["Unlock Calendar", "Governance Watch"],
      active: -1,
    },
  ];

  const chainOptions = [
    { id: 1, name: "Ethereum" },
    { id: 42161, name: "Arbitrum" },
    { id: 8453, name: "Base" },
    { id: 56, name: "BNB Chain" },
  ];

  const [selectedChains, setSelectedChains] = useState<number[]>(
    chainOptions.map((chain) => chain.id)
  );
  const [minUsd, setMinUsd] = useState("50000");
  const [blockCount, setBlockCount] = useState("60");
  const [includeNative, setIncludeNative] = useState(true);
  const [includeErc20, setIncludeErc20] = useState(true);
  const [includeFresh, setIncludeFresh] = useState(false);
  const [includeDeployers, setIncludeDeployers] = useState(true);
  const [smartMoneyItems, setSmartMoneyItems] = useState<SmartMoneyItem[]>([]);
  const [smartMoneyLoading, setSmartMoneyLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("chains", selectedChains.join(","));
    params.set("minUsd", minUsd);
    params.set("blocks", blockCount);
    params.set("native", String(includeNative));
    params.set("erc20", String(includeErc20));
    params.set("fresh", String(includeFresh));
    params.set("deployers", String(includeDeployers));
    params.set("limit", "30");
    return params.toString();
  }, [
    selectedChains,
    minUsd,
    blockCount,
    includeNative,
    includeErc20,
    includeFresh,
    includeDeployers,
  ]);

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

  const topMoves = [
    { change: "-20%", text: "Deployed into XYZ Token", tone: "warning" },
    { change: "+15%", text: "Whale Accumulating ABC", tone: "positive" },
    { change: "+12%", text: "Fresh Wallet Buys DEF", tone: "positive" },
  ];

  const contractWatch = [
    { text: "Proxy Upgrade Detected", tone: "danger" },
    { text: "SUSY Protocol - New Implementation", tone: "" },
    { text: "Mint Function Added", tone: "" },
    { text: "Ownership Change: 0x2a5...12fd -> 0x3b9...f8d1", tone: "" },
  ];

  const topics = ["#FOMC", "Restaking", "L2 Narrative"];

  const events = [
    "Token Unlock: XYZ - 15M Tokens in 2 Days",
    "FOMC Meeting: July 27",
    "New Exchange Listing: ABC on Bybit",
  ];

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
              {section.items.map((item, index) => (
                <div
                  key={item}
                  className={`nav-item ${section.active === index ? "active" : ""}`}
                >
                  <span className="nav-dot" />
                  {item}
                </div>
              ))}
            </div>
          ))}
          <div className="nav-section">
            <h4>Investigation Desk</h4>
            <div className="nav-item active">
              <span className="nav-dot" />
              Investigation Desk
            </div>
          </div>
        </aside>

        <main className="content">
          <div className="content-grid">
            <div className="column">
              <section className="card">
                <div className="card-header">
                  <div className="title">Smart Money Tracker</div>
                  <div className="actions">{smartMoneyLoading ? "Syncing" : "Live"}</div>
                </div>
                <div className="subhead">Filters</div>
                <div className="filter-row">
                  <div className="filter-group">
                    <label>Min USD</label>
                    <input
                      value={minUsd}
                      onChange={(event) => setMinUsd(event.target.value)}
                      type="number"
                      min="0"
                    />
                  </div>
                  <div className="filter-group">
                    <label>Blocks</label>
                    <input
                      value={blockCount}
                      onChange={(event) => setBlockCount(event.target.value)}
                      type="number"
                      min="10"
                      max="500"
                    />
                  </div>
                  <button className="btn" type="button" onClick={fetchSmartMoney}>
                    Refresh
                  </button>
                </div>
                <div className="filter-row">
                  {chainOptions.map((chain) => (
                    <button
                      key={chain.id}
                      type="button"
                      className={`pill ${selectedChains.includes(chain.id) ? "active" : ""}`}
                      onClick={() =>
                        setSelectedChains((prev) =>
                          prev.includes(chain.id)
                            ? prev.filter((id) => id !== chain.id)
                            : [...prev, chain.id]
                        )
                      }
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
                <div className="filter-row">
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={includeNative}
                      onChange={(event) => setIncludeNative(event.target.checked)}
                    />
                    Native transfers
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={includeErc20}
                      onChange={(event) => setIncludeErc20(event.target.checked)}
                    />
                    Token transfers
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={includeDeployers}
                      onChange={(event) => setIncludeDeployers(event.target.checked)}
                    />
                    New deployers
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={includeFresh}
                      onChange={(event) => setIncludeFresh(event.target.checked)}
                    />
                    Fresh wallets only
                  </label>
                </div>
                <div className="subhead">
                  Recent Activity{" "}
                  {lastUpdated ? `· ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
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
                <div className="subhead" style={{ marginTop: 14 }}>
                  Top Moves
                </div>
                <div className="list">
                  {topMoves.map((move) => (
                    <div key={move.text} className="list-item">
                      <span className={`badge ${move.tone}`}>{move.change}</span>
                      <span>{move.text}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="title">Contract Watch</div>
                  <div className="actions">...</div>
                </div>
                <div className="list">
                  {contractWatch.map((item) => (
                    <div key={item.text} className="list-item">
                      <span className={`badge ${item.tone}`}>{item.tone ? "Alert" : "Update"}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="title">Investigation Notebook</div>
                  <div className="actions">...</div>
                </div>
                <div className="list">
                  <div className="list-item">
                    <span>
                      Fresh wallet cluster identified. Monitoring purchases of XYZ Token. Possible
                      insider?
                    </span>
                  </div>
                </div>
                <div className="card-footer">
                  <button className="btn" type="button">
                    Add Notes
                  </button>
                  <button className="btn" type="button">
                    Set Alert
                  </button>
                </div>
              </section>
            </div>

            <div className="column">
              <section className="card">
                <div className="card-header">
                  <div className="title">Sentiment Dashboard</div>
                  <div className="actions">...</div>
                </div>
                <div className="subhead" style={{ marginBottom: 6 }}>
                  X Sentiment Score
                </div>
                <div className="tabs" style={{ marginBottom: 10 }}>
                  <button className="tab active" type="button">
                    X
                  </button>
                  <button className="tab" type="button">
                    GitHub
                  </button>
                  <button className="tab" type="button">
                    News
                  </button>
                </div>
                <div className="list-item" style={{ marginBottom: 12 }}>
                  <strong>Bearish</strong>
                  <span className="badge danger">-18%</span>
                </div>
                <div className="small-note">Social mentions</div>
                <div className="chart" aria-hidden="true">
                  <svg viewBox="0 0 300 120" preserveAspectRatio="none">
                    <path className="gridline" d="M0 30 H300" />
                    <path className="gridline" d="M0 60 H300" />
                    <path className="gridline" d="M0 90 H300" />
                    <path
                      className="line"
                      d="M0 90 L30 70 L60 75 L90 60 L120 65 L150 55 L180 50 L210 65 L240 40 L270 45 L300 30"
                    />
                  </svg>
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="title">Trending Topics</div>
                  <div className="actions">...</div>
                </div>
                <div className="list">
                  {topics.map((topic) => (
                    <div key={topic} className="list-item">
                      <span>{topic}</span>
                      <span className="meta">View</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card">
                <div className="card-header">
                  <div className="title">Upcoming Events</div>
                  <div className="actions">...</div>
                </div>
                <div className="list">
                  {events.map((event) => (
                    <div key={event} className="list-item">
                      <span>{event}</span>
                      <span className="meta">Track</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
