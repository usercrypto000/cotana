import "dotenv/config";
import fs from "fs";
import path from "path";

type State = {
  econSent?: string[];
  cryptoSent?: string[];
};

type EconEvent = {
  id: string;
  date: string; // ISO
  country: string;
  event: string;
  category?: string;
  importance?: number;
};

type CryptoEvent = {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  organizer?: string;
  type?: string;
  website?: string;
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const TE_CLIENT = process.env.TRADING_ECON_CLIENT;
const TE_KEY = process.env.TRADING_ECON_KEY ?? process.env.TRADING_ECON_API_KEY;
const COINDAR_TOKEN = process.env.COINDAR_TOKEN;

const STATE_PATH = path.join(process.cwd(), "data", "tradingview-alert-state.json");

const readState = (): State => {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as State;
  } catch {
    return {};
  }
};

const writeState = (state: State) => {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
};

const today = new Date();
const toDate = new Date();
toDate.setDate(today.getDate() + 3);

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const stripToJson = (text: string) => {
  const start = text.search(/[\[{]/);
  const end = text.lastIndexOf("]");
  if (start >= 0 && end >= start) {
    return text.slice(start, end + 1);
  }
  return text;
};

const fetchJsonWithProxy = async (url: string) => {
  try {
    const res = await fetch(url);
    if (res.ok) return res.json();
  } catch (err) {
    console.warn("direct_fetch_failed", url, err);
  }
  const proxyUrl = `https://r.jina.ai/${url.startsWith("http") ? url : `http://${url}`}`;
  const resProxy = await fetch(proxyUrl);
  if (!resProxy.ok) {
    throw new Error(`proxy_http_${resProxy.status}`);
  }
  const text = await resProxy.text();
  const jsonPart = stripToJson(text);
  return JSON.parse(jsonPart);
};

const buildTeUrl = () => {
  // Use documented country path; guest auth often 500s on the generic endpoint with date filters.
  const params = new URLSearchParams({
    importance: "2,3", // medium + high
    start: formatDate(today),
    end: formatDate(toDate),
    format: "json",
  });
  const creds =
    TE_CLIENT && TE_KEY ? `${encodeURIComponent(TE_CLIENT)}:${encodeURIComponent(TE_KEY)}` : "guest:guest";
  params.append("c", creds);
  // Note: http works with guest; https may 403 via proxy.
  return `http://api.tradingeconomics.com/calendar?${params.toString()}`;
};

const fetchEconomicEvents = async (): Promise<EconEvent[]> => {
  const data = (await fetchJsonWithProxy(buildTeUrl())) as Array<any>;
  const windowStart = new Date(formatDate(today));
  const windowEnd = new Date(formatDate(toDate));
  return (data ?? [])
    .filter((item) => item?.Date && item?.Country && item?.Importance)
    .map((item) => ({
      id: String(item.CalendarId ?? item.URL ?? item.Event ?? item.Date),
      date: item.Date,
      country: item.Country,
      event: item.Event ?? item.Category ?? "Event",
      category: item.Category,
      importance: Number(item.Importance ?? 0),
    }))
    .filter((e) => {
      const d = new Date(e.date);
      return d >= windowStart && d <= windowEnd;
    });
};

const fetchCryptoEvents = async (): Promise<CryptoEvent[]> => {
  if (!COINDAR_TOKEN) {
    throw new Error("missing_coindar_token");
  }
  const params = new URLSearchParams({
    access_token: COINDAR_TOKEN,
    dateStart: formatDate(today),
    dateEnd: formatDate(toDate),
    sortBy: "date_start",
  });
  const data = (await fetchJsonWithProxy(
    `http://coindar.org/api/v2/events?${params.toString()}`
  )) as Array<any>;
  return (data ?? []).map((ev) => ({
    id: String(ev.id ?? ev.eventid ?? ev.title),
    title: ev.caption ?? ev.title ?? "Event",
    description: ev.description ?? "",
    start_date: ev.start_date ?? ev.start_date_time ?? ev.start_date_local,
    end_date: ev.end_date ?? ev.end_date_time ?? ev.end_date_local,
    organizer: ev.source ?? ev.coin_name,
    type: ev.proof ?? ev.tag,
    website: ev.website ?? ev.link,
  }));
};

const cryptoFilter = (event: CryptoEvent) => {
  const text = `${event.title} ${event.description ?? ""}`.toLowerCase();
  const banWords = ["analysis", "prediction", "price target", "story", "rumor", "opinion"];
  if (banWords.some((w) => text.includes(w))) return false;
  // keep tangible happenings only
  const allowedTypes = ["conference", "meetup", "release", "event", "update", "announcement"];
  if (event.type && !allowedTypes.includes(event.type.toLowerCase())) return false;
  return true;
};

const sendTelegram = async (text: string) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`telegram_error_${res.status}:${body}`);
  }
};

const formatEcon = (e: EconEvent) => {
  const dt = new Date(e.date);
  const dateStr = dt.toISOString().replace("T", " ").slice(0, 16);
  const importance = e.importance === 3 ? "★★★" : e.importance === 2 ? "★★" : "★";
  const cat = e.category ? ` (${e.category})` : "";
  return `【Macro】${e.country} — ${e.event}${cat}\nTime: ${dateStr} UTC\nImpact: ${importance}`;
};

const formatCrypto = (e: CryptoEvent) => {
  const start = e.start_date ?? "";
  const end = e.end_date && e.end_date !== e.start_date ? ` → ${e.end_date}` : "";
  const org = e.organizer ? ` | Org: ${e.organizer}` : "";
  const site = e.website ? `\nLink: ${e.website}` : "";
  const type = e.type ? ` [${e.type}]` : "";
  return `【Crypto】${e.title}${type}\nDate: ${start}${end}${org}${site}`;
};

const main = async () => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
  }

  const state = readState();

  let econ: EconEvent[] = [];
  let crypto: CryptoEvent[] = [];
  try {
    econ = await fetchEconomicEvents();
  } catch (err) {
    console.error("macro_fetch_failed", err);
  }
  try {
    crypto = await fetchCryptoEvents();
  } catch (err) {
    console.error("crypto_fetch_failed", err);
  }

  const newEcon = econ.filter((e) => !(state.econSent ?? []).includes(e.id));
  const newCrypto = crypto.filter((e) => cryptoFilter(e) && !(state.cryptoSent ?? []).includes(e.id));

  for (const e of newEcon) {
    await sendTelegram(formatEcon(e));
  }
  for (const c of newCrypto) {
    await sendTelegram(formatCrypto(c));
  }

  // update state after sends
  writeState({
    econSent: [...(state.econSent ?? []), ...newEcon.map((e) => e.id)].slice(-500),
    cryptoSent: [...(state.cryptoSent ?? []), ...newCrypto.map((c) => c.id)].slice(-500),
  });

  console.log(
    `sent ${newEcon.length} macro events and ${newCrypto.length} crypto events (window ${formatDate(
      today
    )} to ${formatDate(toDate)})`
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
