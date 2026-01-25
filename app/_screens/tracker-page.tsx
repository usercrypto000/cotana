import type { CSSProperties } from "react";

const trackerCards = [
  {
    title: "Top Swaps",
    highlight: "$500k",
    timeframe: "Last 24h",
    filters: ["$20k+", "$50k+", "$500k+"],
    activeFilter: "$500k+",
    columns: [
      { key: "address", label: "Address" },
      { key: "label", label: "Label" },
      { key: "amount", label: "Swapped" },
      { key: "source", label: "DEX" },
    ],
    columnsTemplate: "1.2fr 1fr 1.2fr 0.9fr",
    items: [
      {
        address: "0x1aB3...eF56",
        label: "Whale123",
        amount: "1,200 ETH -> $3.5M USDT",
        source: "Uniswap",
        details: {
          label: "Whale123",
          holdings: "$8.4m",
          positions: "3 pools",
          recent: [
            "Uniswap v3: ETH/USDC",
            "Curve: stETH/ETH",
            "Sushi: ARB/USDC",
            "Balancer: WETH/DAI",
            "Uniswap v3: OP/USDC",
          ],
        },
      },
      {
        address: "0x895b...ab47",
        label: "Unknown",
        amount: "800 WBTC -> $32M USDC",
        source: "Uniswap",
        details: {
          label: "Unknown",
          holdings: "$3.1m",
          positions: "2 routes",
          recent: [
            "Uniswap v3: WBTC/USDT",
            "GMX: ETH perp",
            "Uniswap v2: UNI/ETH",
            "Kyber: LINK/USDC",
            "Uniswap v3: ETH/USDC",
          ],
        },
      },
      {
        address: "0x4635...b163F",
        label: "CryptoFund",
        amount: "33.3M ETH -> $12M USDC",
        source: "Sushiswap",
        details: {
          label: "CryptoFund",
          holdings: "$1.6m",
          positions: "4 fills",
          recent: [
            "Aerodrome: AERO/USDC",
            "Uniswap v3: ETH/USDC",
            "Curve: crvUSD/USDC",
            "Velodrome: OP/USDC",
            "Uniswap v3: LDO/ETH",
          ],
        },
      },
      {
        address: "0x3a84...e1058",
        label: "BigTrader",
        amount: "500k LINK -> $510k WETH",
        source: "Balancer",
        details: {
          label: "BigTrader",
          holdings: "$2.4m",
          positions: "2 pools",
          recent: [
            "Balancer: LINK/WETH",
            "Uniswap v3: LINK/ETH",
            "Curve: LINK/ETH",
            "Sushi: LINK/USDC",
            "Uniswap v3: ETH/USDC",
          ],
        },
      },
    ],
  },
  {
    title: "Major Transfers",
    highlight: "$1M",
    timeframe: "Last 24h",
    filters: ["$100k+", "$500k+", "$1M+"],
    activeFilter: "$1M+",
    columns: [
      { key: "address", label: "Address" },
      { key: "amount", label: "Transferred" },
      { key: "source", label: "To / From" },
    ],
    columnsTemplate: "1.2fr 1fr 1.2fr",
    items: [
      {
        address: "0x89dC...a7Fb",
        label: "Whale vault",
        amount: "$4.2M USDC",
        source: "To: Binance",
        details: {
          label: "Whale vault",
          holdings: "$12.7m",
          positions: "Multi-sig",
          recent: [
            "Outbound: 2.1m USDC",
            "Inbound: 640 ETH",
            "Outbound: 920k DAI",
            "Inbound: 1.2m USDT",
            "Outbound: 280k OP",
          ],
        },
      },
      {
        address: "0x88c2...cb97",
        label: "Unknown",
        amount: "$2.8M ETH",
        source: "From: Avalanche Bridge",
        details: {
          label: "Unknown",
          holdings: "$5.3m",
          positions: "2 vaults",
          recent: [
            "Inbound: 420 BTC",
            "Inbound: 6.2m USDT",
            "Outbound: 1.1m USDC",
            "Inbound: 3,100 ETH",
            "Outbound: 900k ARB",
          ],
        },
      },
      {
        address: "0x99c9...ak96a",
        label: "Inbound stream",
        amount: "$2.5M USDC",
        source: "Polygon -> Ethereum",
        details: {
          label: "Inbound stream",
          holdings: "$2.2m",
          positions: "1 bridge",
          recent: [
            "Inbound: 900k USDC",
            "Outbound: 1.4m DAI",
            "Inbound: 1,900 ETH",
            "Outbound: 320k LINK",
            "Inbound: 560k USDT",
          ],
        },
      },
      {
        address: "0x8a34...c927c",
        label: "WhaleVault",
        amount: "$2.2M ETH",
        source: "To: WhaleVault",
        details: {
          label: "WhaleVault",
          holdings: "$3.9m",
          positions: "Custody",
          recent: [
            "Outbound: 1.2m USDC",
            "Inbound: 820 ETH",
            "Outbound: 400k DAI",
            "Inbound: 520k USDT",
            "Outbound: 110k ARB",
          ],
        },
      },
    ],
  },
  {
    title: "Bridge Activity",
    highlight: "$1M",
    timeframe: "Last 24h",
    filters: ["$100k+", "$500k+", "$1M+"],
    activeFilter: "$1M+",
    columns: [
      { key: "address", label: "Address" },
      { key: "label", label: "Label" },
      { key: "amount", label: "Bridged Amount" },
      { key: "source", label: "Bridge" },
    ],
    columnsTemplate: "1.1fr 0.9fr 1fr 1.1fr",
    items: [
      {
        address: "0xeF34...b905",
        label: "Trader456",
        amount: "$3.6M USDT",
        source: "Ethereum <-> Arbitrum",
        details: {
          label: "Trader456",
          holdings: "$4.9m",
          positions: "3 chains",
          recent: [
            "Base -> Arbitrum: 1.3m USDC",
            "Arbitrum -> OP: 820k USDC",
            "OP -> Base: 400 ETH",
            "Base -> zkSync: 610k USDT",
            "Arbitrum -> Base: 920k DAI",
          ],
        },
      },
      {
        address: "0x1655...a865",
        label: "DeFiGroup",
        amount: "$2.2M ETH",
        source: "Polygon <-> Ethereum",
        details: {
          label: "DeFiGroup",
          holdings: "$9.1m",
          positions: "4 routes",
          recent: [
            "Ethereum -> Base: 2m USDC",
            "Base -> Ethereum: 1.1m DAI",
            "Ethereum -> OP: 740k USDT",
            "OP -> Base: 520k USDC",
            "Base -> Ethereum: 300 ETH",
          ],
        },
      },
      {
        address: "0x5799...e807c",
        label: "Unknown",
        amount: "$2.8M USDC",
        source: "Solana <-> Ethereum",
        details: {
          label: "Unknown",
          holdings: "$1.9m",
          positions: "2 bridges",
          recent: [
            "Arbitrum -> Linea: 380k USDC",
            "Arbitrum -> Base: 210k USDT",
            "Linea -> Arbitrum: 140 ETH",
            "Base -> Arbitrum: 320k USDC",
            "Arbitrum -> OP: 190k DAI",
          ],
        },
      },
      {
        address: "0x3374...8725",
        label: "Unknown",
        amount: "$1.8M USDC",
        source: "Jokers <-> Ethereum",
        details: {
          label: "Unknown",
          holdings: "$2.1m",
          positions: "2 bridges",
          recent: [
            "OP -> Base: 320k USDC",
            "Base -> Ethereum: 160k USDT",
            "Polygon -> Base: 120k USDC",
            "Base -> OP: 190k USDC",
            "Base -> Arbitrum: 80k DAI",
          ],
        },
      },
    ],
  },
  {
    title: "Contract Activity",
    highlight: "",
    timeframe: "Last 24h",
    filters: ["Deploys", "Upgrades", "Approvals"],
    activeFilter: "Deploys",
    columns: [
      { key: "address", label: "Address" },
      { key: "label", label: "Label" },
      { key: "amount", label: "Interaction" },
      { key: "source", label: "Details" },
    ],
    columnsTemplate: "1.1fr 0.9fr 1fr 1.1fr",
    items: [
      {
        address: "0x45aD...cF78",
        label: "DevTeam",
        amount: "New Contract",
        source: "Token Deployed",
        details: {
          label: "DevTeam",
          holdings: "$6.6m",
          positions: "5 contracts",
          recent: [
            "Aave: supply USDC",
            "Curve: add liquidity",
            "Balancer: stake LP",
            "Aave: borrow ETH",
            "Lido: stake ETH",
          ],
        },
      },
      {
        address: "0x475A...cF78",
        label: "RiskyWallet",
        amount: "Ownership Change",
        source: "Admin Transfer",
        details: {
          label: "RiskyWallet",
          holdings: "$2.8m",
          positions: "3 protocols",
          recent: [
            "Lyra: buy call",
            "Dopex: open vault",
            "GMX: hedge perp",
            "Lyra: close call",
            "GMX: adjust leverage",
          ],
        },
      },
      {
        address: "0x3885...c963",
        label: "ProjectXYZ",
        amount: "Approval",
        source: "Unlimited USDT Spend",
        details: {
          label: "ProjectXYZ",
          holdings: "$3.4m",
          positions: "7 contracts",
          recent: [
            "Uniswap v3: mint LP",
            "Uniswap v3: collect fees",
            "Balancer: stake LP",
            "Uniswap v3: rebalance",
            "Curve: claim rewards",
          ],
        },
      },
    ],
  },
];

export default function TrackerPage() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Cotana
        </div>
        <div className="searchbar">
          <span className="search-icon" />
          <input placeholder="Search wallets, protocols, or tags" />
        </div>
        <div className="top-actions">
          <button className="action">Alerts</button>
          <button className="action">Watchlist</button>
          <div className="avatar" />
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          <div className="nav-section">
            <h4>Tracking</h4>
            <a className="nav-item" href="/smart-money-tracker">
              <span className="nav-dot" />
              Smart Money Tracker
            </a>
            <a className="nav-item" href="/incentives">
              <span className="nav-dot" />
              Incentives Radar
            </a>
          </div>
        </aside>

        <main className="content tracker-page">
          <div className="tracker-header">
            <h1 className="tracker-title">Smart Tracker</h1>
            <div className="tracker-status">Coming soon</div>
            <div className="tracker-status">
              Track the most active wallets across swaps, transfers, bridges,
              and contract interactions.
            </div>
          </div>

          <div className="tracker-grid">
            {trackerCards.map((card) => (
              <section
                className="card tracker-card"
                key={card.title}
                style={
                  {
                    "--tracker-cols": card.columnsTemplate,
                  } as CSSProperties
                }
              >
                <div className="tracker-card-head">
                  <div className="tracker-card-title">
                    {card.title}
                    {card.highlight ? (
                      <span className="tracker-highlight"> {">"} {card.highlight}</span>
                    ) : null}
                  </div>
                  <button className="tracker-select">{card.timeframe}</button>
                </div>
                <div className="tracker-card-filters">
                  {card.filters.map((filter) => (
                    <button
                      className={`tracker-filter${filter === card.activeFilter ? " active" : ""}`}
                      key={filter}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
                <div className="tracker-table">
                  <div className="tracker-table-header">
                    {card.columns.map((column) => (
                      <span key={column.key}>{column.label}</span>
                    ))}
                  </div>
                  <div className="tracker-table-body">
                    {card.items.map((item) => (
                      <details className="tracker-row" key={item.address}>
                        <summary className="tracker-row-summary">
                          {card.columns.map((column) => (
                            <span key={column.key} className={`tracker-cell ${column.key}`}>
                              {item[column.key as keyof typeof item]}
                            </span>
                          ))}
                        </summary>
                        <div className="tracker-row-details">
                          <div className="detail-row">
                            <strong>Address</strong>
                            <span>{item.address}</span>
                          </div>
                          <div className="detail-row">
                            <strong>Label</strong>
                            <span>{item.details.label}</span>
                          </div>
                          <div className="detail-row">
                            <strong>Holdings</strong>
                            <span>{item.details.holdings}</span>
                          </div>
                          <div className="detail-row">
                            <strong>Positions</strong>
                            <span>{item.details.positions}</span>
                          </div>
                          <div className="detail-row">
                            <strong>Recent 5 Transactions</strong>
                            <ul className="tx-list">
                              {item.details.recent.map((tx) => (
                                <li key={tx} className="tx-item">
                                  {tx}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
