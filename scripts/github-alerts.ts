import "dotenv/config";
import fs from "fs";
import path from "path";

type StateFile = {
  lastRunAt?: string;
  dedupe?: { key: string; ts: number }[];
  alertWindow?: { ts: number; count: number };
};

type SearchRepoItem = {
  full_name: string;
  html_url: string;
  pushed_at: string;
  stargazers_count: number;
  description?: string | null;
  homepage?: string | null;
  owner?: { type?: string };
  fork?: boolean;
  is_template?: boolean;
};

type CodeItem = {
  html_url: string;
  path: string;
  repository: { full_name: string; stargazers_count: number };
  text_matches?: Array<{ fragment: string }>;
};

const PHRASES = [
  "incentivized testnet",
  "testnet",
  "points program",
  "points",
  "season 1",
  "season 2",
  "airdrop checker",
  "claim page",
  "claim contract",
  "snapshot block",
  "reward distributor",
  "emission rate",
  "gauge controller",
  "liquidity mining",
  "rewardpersecond",
  "rewardspersecond",
  "rewardrate",
  "merkle distributor",
  "merkle root",
  "season",
  "incentives",
  "rewards",
  "airdrop",
  "rebates",
  "xp",
  "emissions",
];

const NOISE = ["fix", "refactor", "chore", "docs", "typo", "test", "ci", "lint", "format"];
const TIMING_WORDS = ["live", "starts", "ending", "deadline", "snapshot", "epoch"];
const ACTION_WORDS = ["claim", "eligible", "register", "faucet", "validator"];
const NUMBER_RE = /(\d+%|\d+\s*(apr|apy)|\d{4}-\d{2}-\d{2}|\d+\s*(token|tokens|usd|usdc|eth|btc))/i;
const ALLOW_PATHS = [
  "readme.md",
  "docs/",
  "documentation/",
  "tokenomics/",
  "rewards/",
  "airdrop/",
  "incentives/",
  "changelog.md",
  "release.md",
];
const DENY_PATHS = ["node_modules/", "vendor/", "test/", "tests/", "examples/", "fixtures/"];
const PROTOCOL_HINTS = ["dex", "lending", "perp", "bridge", "rollup"];

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const POLL_MINUTES = Number(process.env.GITHUB_POLL_MINUTES ?? "10");
const STATE_PATH = path.join(process.cwd(), "data", "github-alert-state.json");
const MAX_REPOS_PER_POLL = Number(process.env.GITHUB_MAX_REPOS ?? "10");
const CODE_SCOPES = ["path:README.md", "filename:README.md"];
const SCORE_THRESHOLD = Number(process.env.GITHUB_SCORE_THRESHOLD ?? "8");
const LOOKBACK_DAYS = Number(process.env.GITHUB_LOOKBACK_DAYS ?? "0");
const DRY_RUN = process.env.GITHUB_DRY_RUN === "true";
const ALERT_WINDOW_HOURS = Number(process.env.GITHUB_ALERT_WINDOW_HOURS ?? "12");
const ALERTS_PER_WINDOW = Number(process.env.GITHUB_ALERTS_PER_WINDOW ?? "10");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readState = (): StateFile => {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return { dedupe: [], alertWindow: { ts: Date.now(), count: 0 } };
    }
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as StateFile;
  } catch {
    return { dedupe: [], alertWindow: { ts: Date.now(), count: 0 } };
  }
};

const writeState = (state: StateFile) => {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const normalize = (value: string) =>
  value
    .toLowerCase()
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

const hasTimingWord = (text: string) => TIMING_WORDS.some((word) => text.includes(word));

const shouldIgnoreNoiseOnly = (text: string) => {
  const words = normalize(text).split(" ").filter(Boolean);
  return words.every((word) => NOISE.includes(word));
};

const phraseMatches = (text: string) => PHRASES.filter((kw) => text.includes(kw));

const hasContext = (text: string) =>
  TIMING_WORDS.some((word) => text.includes(word)) ||
  ACTION_WORDS.some((word) => text.includes(word)) ||
  NUMBER_RE.test(text);

const pathAllowed = (pathValue: string) => {
  const lower = pathValue.toLowerCase();
  if (DENY_PATHS.some((deny) => lower.includes(deny))) {
    return false;
  }
  return ALLOW_PATHS.some((allow) => lower.includes(allow));
};

const ghFetch = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.text-match+json",
      "User-Agent": "cotana-alerts",
    },
  });
  if (res.status === 403) {
    const reset = Number(res.headers.get("x-ratelimit-reset") ?? "0");
    const remaining = Number(res.headers.get("x-ratelimit-remaining") ?? "0");
    const now = Math.floor(Date.now() / 1000);
    if (remaining === 0 && reset > now) {
      throw new Error(`rate_limited:${reset - now}`);
    }
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`github_error:${res.status}:${body}`);
  }
  return res.json();
};

const sendTelegramAlert = async (message: string) => {
  if (DRY_RUN) {
    console.log("[github-alerts][dry-run]\n" + message + "\n");
    return;
  }
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

const buildRepoQuery = (since: string, phrases: string[]) => {
  const keywordQuery = phrases.map((kw) => `"${kw}"`).join(" OR ");
  return `${keywordQuery} pushed:>=${since}`;
};

const buildCodeQuery = (repo: string, phrases: string[], scope: string) => {
  const keywordQuery = phrases.map((kw) => `"${kw}"`).join(" OR ");
  return `${keywordQuery} repo:${repo} ${scope}`;
};

const chunkKeywords = (keywords: string[], maxItems = 4) => {
  const chunks: string[][] = [];
  for (let i = 0; i < keywords.length; i += maxItems) {
    chunks.push(keywords.slice(i, i + maxItems));
  }
  return chunks;
};

const alertMessage = (params: {
  repo: string;
  keywords: string[];
  matchType: string;
  path?: string;
  snippet?: string;
  url: string;
  stars?: number;
  timestamp: string;
}) => {
  const snippet = params.snippet ? params.snippet.slice(0, 200) : "";
  return [
    `Repo: ${params.repo}`,
    `Matched: ${params.keywords.join(", ")}`,
    `Type: ${params.matchType}`,
    params.path ? `File: ${params.path}` : "",
    snippet ? `Snippet: ${snippet}` : "",
    `Stars: ${params.stars ?? "?"}`,
    `Time: ${params.timestamp}`,
    params.url,
  ]
    .filter(Boolean)
    .join("\n");
};

const windowHasCapacity = (state: StateFile) => {
  const now = Date.now();
  const windowMs = ALERT_WINDOW_HOURS * 60 * 60 * 1000;
  if (!state.alertWindow || now - state.alertWindow.ts > windowMs) {
    state.alertWindow = { ts: now, count: 0 };
  }
  return state.alertWindow.count < ALERTS_PER_WINDOW;
};

const incrementWindow = (state: StateFile) => {
  state.alertWindow = state.alertWindow ?? { ts: Date.now(), count: 0 };
  state.alertWindow.count += 1;
};

const main = async () => {
  if (!GITHUB_TOKEN || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing GITHUB_TOKEN, TELEGRAM_BOT_TOKEN, or TELEGRAM_CHAT_ID");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const state = readState();
    const now = Date.now();
    const dedupe = (state.dedupe ?? []).filter((entry) => entry.ts > now - 24 * 60 * 60 * 1000);
    const fallbackLookback =
      LOOKBACK_DAYS > 0 ? new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000) : null;
    const lastRun =
      fallbackLookback ?? (state.lastRunAt ? new Date(state.lastRunAt) : new Date(now - 60 * 60 * 1000));
    const since = lastRun.toISOString();

    try {
      const repoChunks = chunkKeywords(PHRASES, 3);
      const repos: SearchRepoItem[] = [];
      for (const chunk of repoChunks) {
        if (!windowHasCapacity(state)) {
          break;
        }
        const repoQuery = buildRepoQuery(since, chunk);
        const repoUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(
          repoQuery
        )}&sort=updated&order=desc&per_page=${MAX_REPOS_PER_POLL}`;
        const repoResult = (await ghFetch(repoUrl)) as { items: SearchRepoItem[] };
        repos.push(...(repoResult.items ?? []));
        await sleep(800);
      }

      for (const repo of repos) {
        const repoText = normalize(`${repo.full_name} ${repo.description ?? ""}`);
        const repoKeywords = phraseMatches(repoText);
        const repoMatchType = "Repo Search";
        const recentPush = Date.now() - new Date(repo.pushed_at).getTime() <= 14 * 24 * 60 * 60 * 1000;
        const starsOk = repo.stargazers_count >= 20;
        const hasWebsite = Boolean(repo.homepage);
        const ownerIsOrg = repo.owner?.type === "Organization";
        const nameHasHint = PROTOCOL_HINTS.some((hint) => repo.full_name.toLowerCase().includes(hint));
        const qualityScore =
          Number(starsOk) + Number(recentPush) + Number(hasWebsite) + Number(ownerIsOrg) + Number(nameHasHint);

        if (repoKeywords.length && windowHasCapacity(state) && qualityScore >= 2) {
          const message = alertMessage({
            repo: repo.full_name,
            keywords: repoKeywords,
            matchType: repoMatchType,
            url: repo.html_url,
            stars: repo.stargazers_count,
            timestamp: new Date().toISOString(),
          });
          await sendTelegramAlert(message);
          incrementWindow(state);
        }

        const codeChunks = chunkKeywords(PHRASES, 3);
        const codeScopes = CODE_SCOPES;
        const codeItems: CodeItem[] = [];
        for (const chunk of codeChunks) {
          if (!windowHasCapacity(state)) {
            break;
          }
          for (const scope of codeScopes) {
            if (!windowHasCapacity(state)) {
              break;
            }
            const codeQuery = buildCodeQuery(repo.full_name, chunk, scope);
            const codeUrl = `https://api.github.com/search/code?q=${encodeURIComponent(
              codeQuery
            )}&per_page=10`;
            const codeResult = (await ghFetch(codeUrl)) as { items: CodeItem[] };
            codeItems.push(...(codeResult.items ?? []));
            await sleep(1200);
          }
        }

        for (const item of codeItems) {
          const fragment = item.text_matches?.[0]?.fragment ?? "";
          const snippet = normalize(fragment);
          const matched = phraseMatches(snippet);
          const matchType = "Code Search";
          const contextOk = hasContext(snippet);
          const isDocPath = pathAllowed(item.path);

          if (!matched.length) {
            continue;
          }
          if (shouldIgnoreNoiseOnly(fragment)) {
            continue;
          }
          if (!isDocPath || !contextOk) {
            continue;
          }

          const repoMeta = repos.find((r) => r.full_name === item.repository.full_name);
          const repoStars = repoMeta?.stargazers_count ?? item.repository.stargazers_count ?? 0;
          const repoRecent = repoMeta
            ? Date.now() - new Date(repoMeta.pushed_at).getTime() <= 14 * 24 * 60 * 60 * 1000
            : false;
          const repoHasWebsite = Boolean(repoMeta?.homepage);
          const repoOwnerOrg = repoMeta?.owner?.type === "Organization";
          const repoNameHint = PROTOCOL_HINTS.some((hint) =>
            item.repository.full_name.toLowerCase().includes(hint)
          );

          let score = 0;
          score += 4; // phrase hit
          score += 3; // doc path
          score += 2; // context terms
          score += Number(NUMBER_RE.test(snippet)) ? 2 : 0;
          score += Number(repoStars >= 20 || repoRecent || repoHasWebsite || repoOwnerOrg || repoNameHint) ? 2 : 0;
          if (item.path.toLowerCase().includes("test") || item.path.toLowerCase().includes("example")) {
            score -= 3;
          }
          if (repoMeta?.fork || repoMeta?.is_template) {
            score -= 5;
          }

          if (score < SCORE_THRESHOLD) {
            continue;
          }

          const dedupeKey = `${item.repository.full_name}:${matched.join("|")}:${item.path}:${hashText(
            fragment
          )}`;
          if (dedupe.some((entry) => entry.key === dedupeKey)) {
            continue;
          }

          if (!windowHasCapacity(state)) {
            break;
          }
          const message = alertMessage({
            repo: item.repository.full_name,
            keywords: matched,
            matchType,
            path: item.path,
            snippet: fragment.replace(/\s+/g, " ").trim(),
            url: item.html_url,
            stars: item.repository.stargazers_count,
            timestamp: new Date().toISOString(),
          });
          await sendTelegramAlert(message);
          dedupe.push({ key: dedupeKey, ts: now });
          incrementWindow(state);
        }
      }

      state.lastRunAt = new Date().toISOString();
      state.dedupe = dedupe;
      writeState(state);
    } catch (err) {
      const message = String(err);
      if (message.startsWith("rate_limited:")) {
        const seconds = Number(message.split(":")[1] ?? "60");
        console.error(`[github-alerts] rate limited, sleeping ${seconds}s`);
        await sleep((seconds + 5) * 1000);
      } else {
        console.error("[github-alerts]", err);
      }
    }

    await sleep(POLL_MINUTES * 60 * 1000);
  }
};

void main();
