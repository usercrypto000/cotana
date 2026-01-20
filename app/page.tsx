import Link from "next/link";

type NavItem = {
  label: string;
  href?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
  active: number;
};

export default function Home() {
  const sections: NavSection[] = [
    {
      title: "Capital & Behavior",
      items: [
        { label: "Smart Money Tracker", href: "/smart-money-tracker" },
        { label: "Wallet Profiler" },
        { label: "Cross-Chain Flows" },
      ],
      active: -1,
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
                  <div className="actions">Live feed</div>
                </div>
                <div className="list">
                  <div className="list-item">
                    <span>Track real-time flows from top wallets across chains.</span>
                    <Link className="btn" href="/smart-money-tracker">
                      Open Tracker
                    </Link>
                  </div>
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
