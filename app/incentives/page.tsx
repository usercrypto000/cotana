"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRewardLabel, isExternalUrl } from "./utils";

type IncentiveRecord = {
  id: number;
  status: string;
  types: string[];
  rewardAssetType: string;
  rewardAssetSymbol?: string | null;
  rewardAssetChain?: string | null;
  rewardAssets?: string | null;
  apy?: string | null;
  capitalRequired: string;
  timeIntensity: string;
  riskFlags: string[];
  riskScore?: number | null;
  saturationScore?: number | null;
  title?: string | null;
  description?: string | null;
  flowSummary?: string | null;
  statusRationale?: string | null;
  howToExtract?: string | null;
  xHandleUrl?: string | null;
  participationUrl?: string | null;
  snapshotWindow?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  lastUpdatedAt: string;
  project: {
    name: string;
    description?: string | null;
    chains: string[];
    raise?: string | null;
    logoUrl?: string | null;
  };
  events?: { title: string; detail?: string | null; effectiveAt: string }[] | null;
  links?: { label: string; url: string }[] | null;
  proofs?: { label: string; url: string }[] | null;
  metrics?: { tvlUsd?: string | null } | null;
};

const tier1Chains = ["Ethereum", "Arbitrum", "Optimism", "Base", "Solana"];
const tier2Chains = [
  "BNB Chain",
  "Polygon",
  "Avalanche",
  "zkSync Era",
  "Starknet",
];
const tier3Chains = [
  "Scroll",
  "Linea",
  "Mantle",
  "Blast",
  "Sei",
  "Sui",
  "Aptos",
  "Near",
  "Tron",
];

const filters = {
  types: [
    "Points",
    "Airdrop",
    "Yield",
    "Volume",
    "Governance",
    "Referral",
    "NFT Rewards",
    "Testnet Incentives",
  ],
  capital: ["None", "Low", "Med", "High"],
  risk: ["Low", "Med", "High", "Unknown"],
  saturation: ["Early", "Active", "Saturated", "Ending"],
};

const formatEnum = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "Not set";

const formatTimestamp = (value: string) => new Date(value).toLocaleString();

const formatUsd = (value?: string | null) => {
  if (!value) return "N/A";
  const num = Number(value);
  if (!Number.isFinite(num)) return "N/A";
  const compact = num.toLocaleString(undefined, {
    notation: "compact",
    maximumFractionDigits: 0,
  });
  return `$${compact}`;
};

export default function IncentivesRadarPage() {
  const [incentives, setIncentives] = useState<IncentiveRecord[]>([]);
  const [selected, setSelected] = useState<IncentiveRecord | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<IncentiveRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("");
  const [chainFilter, setChainFilter] = useState("");
  const [capitalFilter, setCapitalFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [saturationFilter, setSaturationFilter] = useState("");
  const [earlyOnly, setEarlyOnly] = useState(false);
  const [sort, setSort] = useState("fresh");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [availableChains, setAvailableChains] = useState<string[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [error, setError] = useState<string | null>(null);
  const [headerSolid, setHeaderSolid] = useState(false);

  const drawerIncentive = selectedDetail ?? selected;
  const otherChainCount = useMemo(() => {
    if (!drawerIncentive) {
      return 0;
    }
    const tier1Set = new Set(tier1Chains);
    return drawerIncentive.project.chains.filter((chain) => !tier1Set.has(chain)).length;
  }, [drawerIncentive]);
  const drawerRewardAssets = drawerIncentive
    ? drawerIncentive.rewardAssets ??
      (drawerIncentive.rewardAssetSymbol &&
      drawerIncentive.rewardAssetType !== "POINTS"
        ? drawerIncentive.rewardAssetSymbol
        : drawerIncentive.rewardAssetType === "POINTS"
        ? "Points"
        : drawerIncentive.rewardAssetSymbol ?? "Reward")
    : "";
  const drawerSummary = drawerIncentive?.description?.trim() || "N/A";
  const linkProps = (url: string) =>
    isExternalUrl(url) ? { target: "_blank", rel: "noopener noreferrer" } : {};

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const stored = window.localStorage.getItem("cotana-theme") as
      | "light"
      | "dark"
      | null;
    const nextTheme = stored ?? "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    const onScroll = () => setHeaderSolid(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTypeFilter(params.get("type") ?? "");
    setChainFilter(params.get("chain") ?? "");
    setCapitalFilter(params.get("capital") ?? "");
    setRiskFilter(params.get("risk") ?? "");
    setSaturationFilter(params.get("saturation") ?? "");
    setEarlyOnly(params.get("earlyOnly") === "true");
    setSort(params.get("sort") ?? "fresh");
    setSearch(params.get("q") ?? "");
    setInitialized(true);
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (chainFilter) params.set("chain", chainFilter);
    if (capitalFilter) params.set("capital", capitalFilter);
    if (riskFilter) params.set("risk", riskFilter);
    if (saturationFilter) params.set("saturation", saturationFilter);
    if (earlyOnly) params.set("earlyOnly", "true");
    if (sort) params.set("sort", sort);
    if (debouncedSearch) params.set("q", debouncedSearch);
    return params.toString();
  }, [
    typeFilter,
    chainFilter,
    capitalFilter,
    riskFilter,
    saturationFilter,
    earlyOnly,
    sort,
    debouncedSearch,
  ]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const nextUrl = queryString ? `?${queryString}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [queryString, initialized]);

  useEffect(() => {
    if (!initialized) {
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/incentives?${queryString}`);
        if (!res.ok) {
          throw new Error("Failed to load incentives");
        }
        const data = await res.json();
        const items = (data.items ?? []) as IncentiveRecord[];
        setIncentives(items);
        const chainSet = new Set<string>();
        items.forEach((item) => {
          item.project.chains.forEach((chain) => chainSet.add(chain));
        });
        setAvailableChains(Array.from(chainSet).sort());
        const nextSelected =
          items.find((item) => item.id === selected?.id) ?? items[0] ?? null;
        setSelected(nextSelected);
        setSelectedDetail(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load incentives");
        setIncentives([]);
        setAvailableChains([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [queryString, initialized]);

  useEffect(() => {
    if (!selected) {
      setSelectedDetail(null);
      return;
    }
    const loadDetail = async () => {
      const res = await fetch(`/api/incentives/${selected.id}`);
      const data = await res.json();
      setSelectedDetail(data.item ?? selected);
    };
    void loadDetail();
  }, [selected]);

  const resetFilters = () => {
    setTypeFilter("");
    setChainFilter("");
    setCapitalFilter("");
    setRiskFilter("");
    setSaturationFilter("");
    setEarlyOnly(false);
    setSort("fresh");
    setSearch("");
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("cotana-theme", next);
  };

  return (
    <div className="app-shell">
      <header className={`topbar topbar-logo-left ${headerSolid ? "topbar-solid" : "topbar-transparent"}`}>
        <div className="topbar-logo">
          <span className="logo-text">Cotana</span>
        </div>
        <div className="topbar-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
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
        </div>
      </header>

      <div className="shell-body no-sidebar">
        <main className="content incentives-page">
          <section className="hero">
            <div className="hero-inner">
              <div className="hero-brand">Cotana</div>
              <h1 className="hero-title">Incentives Radar</h1>
              <p className="hero-subtitle">
                High-signal view of incentive flows across DeFi. Filters default to
                cut noise and surface active programs.
              </p>
            </div>
          </section>

          <section className="filters-card">
            <div className="filters-row">
              <div className="filter-group">
                <label>Incentive type</label>
                <select
                  className="filter-select"
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value)}
                >
                  <option value="">All types</option>
                  {filters.types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Chain</label>
                <select
                  className="filter-select"
                  value={chainFilter}
                  onChange={(event) => setChainFilter(event.target.value)}
                >
                  <option value="">All chains</option>
                  {availableChains.map((chain) => (
                    <option key={chain} value={chain}>
                      {chain}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="filters-row">
              <div className="filter-group">
                <label>Capital required</label>
                <select
                  className="filter-select"
                  value={capitalFilter}
                  onChange={(event) => setCapitalFilter(event.target.value)}
                >
                  <option value="">All</option>
                  {filters.capital.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Risk level</label>
                <select
                  className="filter-select"
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value)}
                >
                  <option value="">All</option>
                  {filters.risk.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Saturation</label>
                <select
                  className="filter-select"
                  value={saturationFilter}
                  onChange={(event) => setSaturationFilter(event.target.value)}
                >
                  <option value="">All</option>
                  {filters.saturation.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <label className="toggle-pill">
                <input
                  type="checkbox"
                  checked={earlyOnly}
                  onChange={(event) => setEarlyOnly(event.target.checked)}
                />
                Early only
              </label>
            </div>
            <div className="filters-row filters-footer">
              <div className="sort-group">
                <span className="sort-label">Sort</span>
                <div className="tabs">
                  <button
                    className={`tab${sort === "fresh" ? " active" : ""}`}
                    onClick={() => setSort("fresh")}
                  >
                    Fresh incentives
                  </button>
                  <button
                    className={`tab${sort === "least_saturated" ? " active" : ""}`}
                    onClick={() => setSort("least_saturated")}
                  >
                    Least saturated
                  </button>
                  <button
                    className={`tab${sort === "lowest_effort" ? " active" : ""}`}
                    onClick={() => setSort("lowest_effort")}
                  >
                    Lowest effort
                  </button>
                </div>
              </div>
              <div className="filters-actions">
                <button className="btn secondary" onClick={resetFilters}>
                  Reset filters
                </button>
                <button className="btn">Save view</button>
              </div>
            </div>
          </section>

          <section className="incentive-grid">
            {loading ? (
              <div className="small-note">Loading incentives...</div>
            ) : error ? (
              <div className="small-note">{error}</div>
            ) : incentives.length === 0 ? (
              <div className="small-note">No incentives match your filters.</div>
            ) : (
              incentives.map((incentive) => {
                const tier1 = incentive.project.chains.filter((chain) =>
                  tier1Chains.includes(chain)
                );
                const otherCount = incentive.project.chains.length - tier1.length;
                const statusLabel = formatEnum(incentive.status);
                const statusClass = incentive.status.toLowerCase();
                const rewardLabel = formatRewardLabel(
                  incentive.rewardAssetType,
                  incentive.rewardAssetSymbol
                );
                const saturation = incentive.saturationScore ?? 0;
                return (
                  <article className="incentive-card" key={incentive.id}>
                    <div className="incentive-head">
                      <div className="incentive-head-left">
                        <div className="title-row">
                          {incentive.project.logoUrl ? (
                            <img
                              className="project-logo card-logo"
                              src={incentive.project.logoUrl}
                              alt={`${incentive.project.name} logo`}
                            />
                          ) : (
                            <div className="project-logo card-logo placeholder" aria-hidden="true" />
                          )}
                          <div className="incentive-title">
                            {incentive.project.name}
                          </div>
                        </div>
                        {incentive.title ? (
                          <div className="incentive-subtitle">{incentive.title}</div>
                        ) : null}
                      </div>
                      <div className="status-stack">
                        {["early", "active"].includes(statusClass) ? (
                          <span className={`status-ribbon ${statusClass}`}>
                            {statusLabel}
                          </span>
                        ) : (
                          <span className={`status-chip ${statusClass}`}>{statusLabel}</span>
                        )}
                        {incentive.apy ? (
                          <span className="apy-pill">{incentive.apy}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="chain-row">
                      {tier1.map((chain) => (
                        <span className="chain-chip" key={chain}>
                          {chain}
                        </span>
                      ))}
                      {otherCount > 0 ? (
                        <span className="chain-chip muted">+{otherCount}</span>
                      ) : null}
                    </div>
                    <div className="type-row">
                      {incentive.types.map((type) => (
                        <span className="type-chip" key={type}>
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className="incentive-meta">
                      <div>
                        <div className="meta-label">Reward</div>
                        <div className="meta-value">{rewardLabel}</div>
                      </div>
                      <div>
                        <div className="meta-label">Capital required</div>
                        <div className="meta-value">
                          {formatEnum(incentive.capitalRequired)}
                        </div>
                      </div>
                      <div>
                        <div className="meta-label">Time intensity</div>
                        <div className="meta-value">
                          {formatEnum(incentive.timeIntensity)}
                        </div>
                      </div>
                      <div>
                        <div className="meta-label">Risk score</div>
                        <div className="meta-value">
                          {typeof incentive.riskScore === "number"
                            ? `${incentive.riskScore}/10`
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                    <div className="incentive-badges">
                      {incentive.riskFlags.map((flag) => (
                        <span className="badge danger" key={flag}>
                          {flag}
                        </span>
                      ))}
                    </div>
                    <div className="saturation-row">
                      <div className="meta-label">Saturation</div>
                      <div className="meter">
                        <span style={{ width: `${saturation}%` }} />
                      </div>
                      <div className="meta-value">{saturation}%</div>
                    </div>
                    <div className="incentive-footer">
                      <span className="small-note">
                        Updated {formatTimeAgo(incentive.lastUpdatedAt)}
                      </span>
                      <button
                        className="btn"
                        onClick={() => {
                          setSelected(incentive);
                          setDrawerOpen(true);
                        }}
                      >
                        View Incentive Flow
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <footer className="page-footer">
            <span>Copyright Cotana 2026 · Built by @tiCkr0x</span>
          </footer>
        </main>

        {drawerOpen && drawerIncentive ? (
          <div className="modal-backdrop" onClick={() => setDrawerOpen(false)}>
            <aside className="drawer modal" onClick={(event) => event.stopPropagation()}>
              <div className="drawer-head">
                <div className="drawer-head-left">
                  <div className="title-row">
                    {drawerIncentive.project.logoUrl ? (
                      <img
                        className="project-logo drawer-logo"
                        src={drawerIncentive.project.logoUrl}
                        alt={`${drawerIncentive.project.name} logo`}
                      />
                    ) : (
                      <div
                        className="project-logo drawer-logo placeholder"
                        aria-hidden="true"
                      />
                    )}
                    <div className="drawer-title">
                      {drawerIncentive.title ?? drawerIncentive.project.name}
                    </div>
                  </div>
                  <div className="drawer-meta">{drawerIncentive.project.name}</div>
                  <div className="drawer-sub">{drawerSummary}</div>
                </div>
                <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
                  Close
                </button>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Chains</div>
                <div className="chain-row">
                  {drawerIncentive.project.chains.length ? (
                    drawerIncentive.project.chains.map((chain) => (
                      <span className="chain-chip" key={chain}>
                        {chain}
                      </span>
                    ))
                  ) : (
                    <span className="chain-chip muted">N/A</span>
                  )}
                  {otherChainCount > 0 ? (
                    <span className="chain-chip muted">Tier 2/3 expanded</span>
                  ) : null}
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Program window</div>
                <div className="data-age-grid">
                  <div className="data-age-item">
                    <span>Start</span>
                    <strong>
                      {drawerIncentive.startAt
                        ? formatDate(drawerIncentive.startAt)
                        : "N/A"}
                    </strong>
                  </div>
                  <div className="data-age-item">
                    <span>End</span>
                    <strong>
                      {drawerIncentive.endAt ? formatDate(drawerIncentive.endAt) : "N/A"}
                    </strong>
                  </div>
                  <div className="data-age-item">
                    <span>Snapshot</span>
                    <strong>{drawerIncentive.snapshotWindow ?? "N/A"}</strong>
                  </div>
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Program details</div>
                <div className="data-age-grid">
                  <div className="data-age-item">
                    <span>Reward assets</span>
                    <strong>{drawerRewardAssets || "N/A"}</strong>
                  </div>
                  <div className="data-age-item">
                    <span>TVL</span>
                    <strong>{formatUsd(drawerIncentive.metrics?.tvlUsd)}</strong>
                  </div>
                  <div className="data-age-item">
                    <span>X handle</span>
                    {drawerIncentive.xHandleUrl ? (
                      <a
                        className="link-card secondary"
                        href={drawerIncentive.xHandleUrl}
                        {...linkProps(drawerIncentive.xHandleUrl)}
                      >
                        View
                      </a>
                    ) : (
                      <strong>N/A</strong>
                    )}
                  </div>
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Incentive breakdown timeline</div>
                <div className="timeline">
                  {(drawerIncentive.events ?? []).length === 0 ? (
                    <div className="small-note">N/A</div>
                  ) : (
                    drawerIncentive.events?.map((event) => (
                      <div className="timeline-item" key={event.title}>
                        <div className="timeline-date">
                          {new Date(event.effectiveAt).toLocaleDateString()}
                        </div>
                        <div>
                          <div className="timeline-title">{event.title}</div>
                          <div className="timeline-detail">{event.detail ?? ""}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">How to participate</div>
                <div className="drawer-text">
                  {drawerIncentive.howToExtract ?? "N/A"}
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Status rationale</div>
                <div className="drawer-text">
                  {drawerIncentive.statusRationale ?? "N/A"}
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Links</div>
                <div className="link-grid">
                  {(drawerIncentive.links ?? []).length === 0 ? (
                    <div className="small-note">N/A</div>
                  ) : (
                    drawerIncentive.links?.map((link) => (
                      <a
                        className="link-card"
                        key={link.url}
                        href={link.url}
                        {...linkProps(link.url)}
                      >
                        {link.label}
                      </a>
                    ))
                  )}
                  {drawerIncentive.participationUrl ? (
                    <a
                      className="link-card"
                      href={drawerIncentive.participationUrl}
                      {...linkProps(drawerIncentive.participationUrl)}
                    >
                      Participation link
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="drawer-section">
                <div className="drawer-label">Onchain proofs</div>
                <div className="link-grid">
                  {(drawerIncentive.proofs ?? []).length === 0 ? (
                    <div className="small-note">N/A</div>
                  ) : (
                    drawerIncentive.proofs?.map((link) => (
                      <a
                        className="link-card secondary"
                        key={link.url}
                        href={link.url}
                        {...linkProps(link.url)}
                      >
                        {link.label}
                      </a>
                    ))
                  )}
                </div>
              </div>
              <div className="drawer-footer">
                <span className="small-note">
                  Last updated: {formatTimestamp(drawerIncentive.lastUpdatedAt)}
                </span>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
