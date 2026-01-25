import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  createPublicClient,
  decodeFunctionData,
  http,
  keccak256,
  parseAbi,
  toBytes,
  type Address,
} from "viem";

type ChainConfig = {
  name: string;
  rpcUrl: string;
  explorerTx: string;
  explorerAddress: string;
};

type RawEvent = {
  chain: string;
  txHash: string;
  block: bigint;
  contract: string;
  method: string;
  input: string;
  args?: Record<string, unknown>;
};

type IncentiveEvent = {
  chain: string;
  project: string;
  pool?: string;
  type:
    | "EMISSION_START"
    | "EMISSION_CHANGE"
    | "REWARD_TOPUP"
    | "REWARD_TOKEN_ADDED"
    | "REWARD_ENDING_SOON";
  rewardToken?: string;
  rewardRate?: number | null;
  rewardPerDayUsd?: number | null;
  rewardPerMonthUsd?: number | null;
  txHash: string;
  block: bigint;
  contract: string;
  reason: string;
};

type StateFile = {
  lastSeenBlock?: Record<string, string>;
  recentAlerts?: { key: string; ts: number }[];
  lastRates?: Record<string, number>;
};

const KNOBS = {
  minRewardPerDayUsd: Number(process.env.MIN_REWARD_PER_DAY_USD ?? "0"),
  minRewardPerMonthUsd: Number(process.env.MIN_REWARD_PER_MONTH_USD ?? "0"),
  maxParticipants: Number(process.env.MAX_PARTICIPANTS ?? "0"),
  emissionChangePct: Number(process.env.EMISSION_CHANGE_PCT ?? "25"),
  cooldownHours: Number(process.env.COOLDOWN_HOURS ?? "24"),
  allowUnknownAmount: process.env.ALLOW_UNKNOWN_AMOUNT === "true",
};

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? "600000");
const MAX_BLOCKS_PER_RUN = Number(process.env.MAX_BLOCKS_PER_RUN ?? "200");
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const RPC_URL_BASE = process.env.RPC_URL_BASE ?? "";

const STATE_PATH = path.join(process.cwd(), "data", "onchain-alert-state.json");

const chains: ChainConfig[] = [
  {
    name: "ethereum",
    rpcUrl: ALCHEMY_KEY ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : "",
    explorerTx: "https://etherscan.io/tx/",
    explorerAddress: "https://etherscan.io/address/",
  },
  {
    name: "arbitrum",
    rpcUrl: ALCHEMY_KEY ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}` : "",
    explorerTx: "https://arbiscan.io/tx/",
    explorerAddress: "https://arbiscan.io/address/",
  },
  {
    name: "base",
    rpcUrl: RPC_URL_BASE,
    explorerTx: "https://basescan.org/tx/",
    explorerAddress: "https://basescan.org/address/",
  },
  {
    name: "bnb",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    explorerTx: "https://bscscan.com/tx/",
    explorerAddress: "https://bscscan.com/address/",
  },
].filter((chain) => Boolean(chain.rpcUrl));

const WATCHED_CONTRACTS: Record<
  string,
  Array<{ address: string; project: string; pool?: string; participants?: number }>
> = {
  ethereum: [],
  arbitrum: [],
  base: [],
  bnb: [],
};

const METHODS = [
  { signature: "notifyRewardAmount(address,uint256)", type: "REWARD_TOPUP" },
  { signature: "addReward(address,address)", type: "REWARD_TOKEN_ADDED" },
  { signature: "setEmissionRate(uint256)", type: "EMISSION_CHANGE" },
  { signature: "setRewards(address,uint256)", type: "EMISSION_CHANGE" },
  { signature: "fundRewards(address,uint256)", type: "REWARD_TOPUP" },
  { signature: "startCampaign(uint256,uint256)", type: "EMISSION_START" },
  { signature: "setIncentives(address,uint256)", type: "EMISSION_CHANGE" },
  { signature: "setPeriodFinish(uint256)", type: "REWARD_ENDING_SOON" },
];

const METHOD_SELECTORS = new Map(
  METHODS.map((method) => [keccak256(toBytes(method.signature)).slice(0, 10), method])
);

const ABI = parseAbi(METHODS.map((method) => `function ${method.signature}`));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readState = (): StateFile => {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return { lastSeenBlock: {}, recentAlerts: [], lastRates: {} };
    }
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as StateFile;
  } catch {
    return { lastSeenBlock: {}, recentAlerts: [], lastRates: {} };
  }
};

const writeState = (state: StateFile) => {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const sendTelegramAlert = async (message: string) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    disable_web_page_preview: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`telegram_error:${res.status}:${text}`);
  }
};

const buildAlert = (event: IncentiveEvent, chain: ChainConfig) => {
  const rewardText =
    event.rewardToken || event.rewardPerDayUsd || event.rewardPerMonthUsd
      ? `Reward: ${event.rewardToken ?? "unknown"} | $/day ${
          event.rewardPerDayUsd ?? "?"
        } | $/month ${event.rewardPerMonthUsd ?? "?"}`
      : "Reward: unknown";

  const explorerTx = `${chain.explorerTx}${event.txHash}`;
  const explorerContract = `${chain.explorerAddress}${event.contract}`;

  return [
    `${event.project}${event.pool ? ` • ${event.pool}` : ""}`,
    `Chain: ${event.chain} | Type: ${event.type}`,
    rewardText,
    `Tx: ${event.txHash}`,
    `Block: ${event.block.toString()}`,
    `Contract: ${event.contract}`,
    `Reason: ${event.reason}`,
    explorerTx,
    explorerContract,
  ].join("\n");
};

const shouldAlert = (event: IncentiveEvent, state: StateFile) => {
  const recentAlerts = state.recentAlerts ?? [];
  const now = Date.now();
  const cutoff = now - KNOBS.cooldownHours * 60 * 60 * 1000;
  const dedupeKey = `${event.project}:${event.type}:${event.rewardToken ?? "na"}`;

  if (recentAlerts.some((entry) => entry.key === dedupeKey && entry.ts > cutoff)) {
    if (event.type === "EMISSION_CHANGE" && event.rewardRate != null) {
      const rateKey = `${event.project}:${event.rewardToken ?? "na"}`;
      const lastRate = state.lastRates?.[rateKey] ?? 0;
      const deltaPct = lastRate > 0 ? (Math.abs(event.rewardRate - lastRate) / lastRate) * 100 : 0;
      if (deltaPct < KNOBS.emissionChangePct) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (KNOBS.maxParticipants > 0) {
    // Placeholder for saturation checks when participant counts exist.
    // Without metrics, allow through.
  }

  if (
    !KNOBS.allowUnknownAmount &&
    (event.rewardPerDayUsd == null || event.rewardPerMonthUsd == null)
  ) {
    return false;
  }

  if (event.rewardPerDayUsd != null && event.rewardPerDayUsd < KNOBS.minRewardPerDayUsd) {
    return false;
  }
  if (
    event.rewardPerMonthUsd != null &&
    event.rewardPerMonthUsd < KNOBS.minRewardPerMonthUsd
  ) {
    return false;
  }

  return true;
};

const classifyEvent = (raw: RawEvent, project: string, pool?: string): IncentiveEvent | null => {
  const method = METHOD_SELECTORS.get(raw.input.slice(0, 10));
  if (!method) {
    return null;
  }

  const rewardToken =
    typeof raw.args?.rewardToken === "string"
      ? (raw.args.rewardToken as string)
      : undefined;

  return {
    chain: raw.chain,
    project,
    pool,
    type: method.type as IncentiveEvent["type"],
    rewardToken,
    rewardRate: typeof raw.args?.rewardRate === "number" ? raw.args.rewardRate : null,
    rewardPerDayUsd: typeof raw.args?.rewardPerDayUsd === "number" ? raw.args.rewardPerDayUsd : null,
    rewardPerMonthUsd:
      typeof raw.args?.rewardPerMonthUsd === "number" ? raw.args.rewardPerMonthUsd : null,
    txHash: raw.txHash,
    block: raw.block,
    contract: raw.contract,
    reason: `Matched method ${method.signature}`,
  };
};

const decodeArgs = (input: `0x${string}`) => {
  try {
    const decoded = decodeFunctionData({ abi: ABI, data: input });
    const args = decoded.args ?? [];
    const name = decoded.functionName;

    if (name === "notifyRewardAmount") {
      const [rewardToken, amount] = args as [string, bigint];
      return { rewardToken, amount: Number(amount) };
    }
    if (name === "addReward") {
      const [rewardToken] = args as [string, string];
      return { rewardToken };
    }
    if (name === "setEmissionRate") {
      const [rewardRate] = args as [bigint];
      return { rewardRate: Number(rewardRate) };
    }
    if (name === "setRewards") {
      const [rewardToken, rewardRate] = args as [string, bigint];
      return { rewardToken, rewardRate: Number(rewardRate) };
    }
    if (name === "fundRewards") {
      const [rewardToken, amount] = args as [string, bigint];
      return { rewardToken, amount: Number(amount) };
    }
    if (name === "setIncentives") {
      const [rewardToken, rewardRate] = args as [string, bigint];
      return { rewardToken, rewardRate: Number(rewardRate) };
    }
    if (name === "setPeriodFinish") {
      const [endTime] = args as [bigint];
      return { endTime: Number(endTime) };
    }
  } catch {
    return {};
  }
  return {};
};

const processChain = async (chain: ChainConfig, state: StateFile) => {
  const client = createPublicClient({ transport: http(chain.rpcUrl) });
  const latest = await client.getBlockNumber();
  const lastSeen = BigInt(state.lastSeenBlock?.[chain.name] ?? "0");
  const start = lastSeen > BigInt(0) ? lastSeen + BigInt(1) : latest;
  const maxBlocks = BigInt(MAX_BLOCKS_PER_RUN);
  const effectiveStart =
    latest - start > maxBlocks ? latest - maxBlocks + BigInt(1) : start;

  const watched = WATCHED_CONTRACTS[chain.name] ?? [];
  if (!watched.length) {
    state.lastSeenBlock = state.lastSeenBlock ?? {};
    state.lastSeenBlock[chain.name] = latest.toString();
    return;
  }

  for (let blockNumber = effectiveStart; blockNumber <= latest; blockNumber += BigInt(1)) {
    const block = await client.getBlock({ blockNumber, includeTransactions: true });
    for (const tx of block.transactions) {
      if (!tx.to) {
        continue;
      }
      const contract = tx.to.toLowerCase();
      const target = watched.find((item) => item.address.toLowerCase() === contract);
      if (!target) {
        continue;
      }
      const selector = tx.input.slice(0, 10);
      if (!METHOD_SELECTORS.has(selector)) {
        continue;
      }
      const args = decodeArgs(tx.input);
      const rawEvent: RawEvent = {
        chain: chain.name,
        txHash: tx.hash,
        block: blockNumber,
        contract: contract,
        method: selector,
        input: tx.input,
        args,
      };
      const event = classifyEvent(rawEvent, target.project, target.pool);
      if (!event) {
        continue;
      }

      if (!state.lastRates) {
        state.lastRates = {};
      }
      if (event.rewardRate != null) {
        const rateKey = `${event.project}:${event.rewardToken ?? "na"}`;
        state.lastRates[rateKey] = event.rewardRate;
      }

      if (!shouldAlert(event, state)) {
        continue;
      }

      const message = buildAlert(event, chain);
      await sendTelegramAlert(message);

      state.recentAlerts = state.recentAlerts ?? [];
      state.recentAlerts.push({
        key: `${event.project}:${event.type}:${event.rewardToken ?? "na"}`,
        ts: Date.now(),
      });
    }
  }

  state.lastSeenBlock = state.lastSeenBlock ?? {};
  state.lastSeenBlock[chain.name] = latest.toString();
};

const main = async () => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }
  if (!chains.length) {
    throw new Error("No RPC URLs configured");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const state = readState();
    state.recentAlerts = (state.recentAlerts ?? []).filter(
      (entry) => entry.ts > Date.now() - KNOBS.cooldownHours * 60 * 60 * 1000
    );

    try {
      for (const chain of chains) {
        await processChain(chain, state);
        await sleep(500);
      }
      writeState(state);
    } catch (err) {
      console.error("[onchain-alerts]", err);
    }

    await sleep(POLL_INTERVAL_MS);
  }
};

void main();
