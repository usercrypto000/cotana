import "dotenv/config";
import crypto from "crypto";
import fs from "fs";
import path from "path";

type StateFile = {
  lastSeenId?: string;
  recentHashes?: { hash: string; ts: number }[];
};

const KEYWORDS = [
  "launch",
  "live",
  "testnet",
  "mainnet",
  "beta",
  "alpha",
  "devnet",
  "new protocol",
  "new chain",
  "new L2",
  "infra",
  "rollup",
  "zk",
  "restaking",
  "bridge",
  "oracle",
  "points",
  "season",
  "snapshot",
  "xp",
  "rewards",
  "airdrop",
  "contracts deployed",
  "genesis",
  "faucet",
  "validator",
  "node",
  "staking live",
  "now live",
  "just launched",
  "is live",
  "opened today",
  "starting today",
];

const STATUS_PHRASES = ["now live", "just launched", "is live", "opened today", "starting today"];

const STATE_PATH = path.join(process.cwd(), "data", "x-alert-state.json");

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN ?? process.env.BREARER_TOKEN ?? "";
const X_API_KEY = process.env.API_KEY ?? "";
const X_API_SECRET = process.env.API_KEY_SECRET ?? "";
const X_ACCESS_TOKEN = process.env.ACCESS_TOKEN ?? "";
const X_ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? "30000");
const WHITELIST = (process.env.X_WHITELIST ?? "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readState = (): StateFile => {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return { recentHashes: [] };
    }
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as StateFile;
  } catch {
    return { recentHashes: [] };
  }
};

const writeState = (state: StateFile) => {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return String(hash);
};

const hasKeywordMatches = (text: string) => {
  const matches = KEYWORDS.filter((keyword) => text.includes(keyword));
  return matches;
};

const hasStatusPhrase = (text: string) =>
  STATUS_PHRASES.some((phrase) => text.includes(phrase));

const shouldAlert = ({
  text,
  hasUrl,
  isWhitelisted,
}: {
  text: string;
  hasUrl: boolean;
  isWhitelisted: boolean;
}) => {
  if (hasUrl || isWhitelisted) {
    return true;
  }
  return hasStatusPhrase(text);
};

const buildQuery = () => {
  const keywordQuery = KEYWORDS.map((keyword) => `"${keyword}"`).join(" OR ");
  return `(${keywordQuery}) -filter:replies lang:en`;
};

const buildOauthHeader = (method: string, url: string, params: Record<string, string>) => {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: X_ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const sorted = Object.keys(allParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sorted),
  ].join("&");

  const signingKey = `${encodeURIComponent(X_API_SECRET)}&${encodeURIComponent(
    X_ACCESS_TOKEN_SECRET
  )}`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const header =
    "OAuth " +
    Object.keys(headerParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(headerParams[key])}"`)
      .join(", ");

  return header;
};

const fetchRecentTweets = async (sinceId?: string) => {
  const query = process.env.X_QUERY_OVERRIDE ?? buildQuery();
  const params: Record<string, string> = {
    q: query,
    result_type: "recent",
    count: "25",
    include_entities: "true",
    tweet_mode: "extended",
  };
  if (sinceId) {
    params.since_id = sinceId;
  }

  const url = "https://api.x.com/1.1/search/tweets.json";
  const authHeader = buildOauthHeader("GET", url, params);
  const requestUrl = `${url}?${new URLSearchParams(params).toString()}`;

  const res = await fetch(requestUrl, {
    headers: { Authorization: authHeader },
  });

  if (res.status === 429 || res.status === 420) {
    const retryAfter = Number(res.headers.get("retry-after") ?? "60");
    throw new Error(`rate_limited:${retryAfter}`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`x_api_error:${res.status}:${text}`);
  }

  return (await res.json()) as {
    statuses?: Array<{
      id_str: string;
      full_text?: string;
      text?: string;
      created_at: string;
      entities?: { urls?: Array<{ expanded_url?: string }> };
      user?: { screen_name?: string; verified?: boolean };
    }>;
  };
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

const buildAlert = ({
  keywords,
  text,
  username,
  url,
  timestamp,
}: {
  keywords: string[];
  text: string;
  username: string;
  url: string;
  timestamp: string;
}) => {
  const trimmed = text.length > 220 ? `${text.slice(0, 217)}...` : text;
  return [
    `Matched: ${keywords.join(", ")}`,
    `@${username}`,
    trimmed,
    url,
    `Time: ${timestamp}`,
  ].join("\n");
};

const main = async () => {
  if (!X_API_KEY || !X_API_SECRET || !X_ACCESS_TOKEN || !X_ACCESS_TOKEN_SECRET) {
    throw new Error("Missing API_KEY, API_KEY_SECRET, ACCESS_TOKEN, or ACCESS_TOKEN_SECRET");
  }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const state = readState();
    const recentHashes = state.recentHashes ?? [];
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = recentHashes.filter((entry) => entry.ts > cutoff);

    try {
      const payload = await fetchRecentTweets(state.lastSeenId);
      const tweets = payload.statuses ?? [];
      const sorted = [...tweets].sort((a, b) => Number(a.id_str) - Number(b.id_str));

      for (const tweet of sorted) {
        const text = tweet.full_text ?? tweet.text ?? "";
        const normalized = normalizeText(text);
        const keywords = hasKeywordMatches(normalized);
        if (!keywords.length) {
          continue;
        }

        const username = tweet.user?.screen_name ?? "unknown";
        const isWhitelisted = WHITELIST.includes(username.toLowerCase());
        const hasUrl = Boolean(tweet.entities?.urls?.length);

        if (!shouldAlert({ text: normalized, hasUrl, isWhitelisted })) {
          continue;
        }

        const topicHash = hashText(normalized);
        if (recent.some((entry) => entry.hash === topicHash)) {
          continue;
        }

        const tweetUrl = `https://x.com/${username}/status/${tweet.id_str}`;
        const message = buildAlert({
          keywords,
          text,
          username,
          url: tweetUrl,
          timestamp: tweet.created_at,
        });

        await sendTelegramAlert(message);
        recent.push({ hash: topicHash, ts: Date.now() });
        state.lastSeenId = tweet.id_str;
      }

      state.recentHashes = recent;
      writeState(state);
    } catch (err) {
      const message = String(err);
      if (message.startsWith("rate_limited:")) {
        const seconds = Number(message.split(":")[1] ?? "30");
        await sleep(seconds * 1000);
      } else {
        console.error("[x-alerts]", err);
        await sleep(10_000);
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }
};

void main();
