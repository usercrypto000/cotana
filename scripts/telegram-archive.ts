import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN ?? "";
const APP_BASE_URL = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const STATE_FILE = path.join(process.cwd(), ".archive-bot-state.json");
const POLL_MS = 5000;

const readState = () => {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { lastUpdateId: 0 };
  }
};

const writeState = (state: { lastUpdateId: number }) => {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
};

const tgApi = (method: string) => `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;

const sendMessage = async (text: string) => {
  await fetch(tgApi("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
};

const archiveProject = async (slug: string) => {
  const res = await fetch(`${APP_BASE_URL}/api/admin/archive-project`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_BOT_TOKEN}`,
    },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`archive_failed:${res.status}:${text}`);
  }
  return res.json();
};

const parseArchiveCommand = (text: string) => {
  const match = text.trim().match(/^\/archive\s+([a-z0-9-]+)$/i);
  return match ? match[1] : null;
};

const run = async () => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID || !ADMIN_BOT_TOKEN) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, or ADMIN_BOT_TOKEN");
  }

  let { lastUpdateId } = readState();
  await sendMessage("Archive bot is running. Use /archive <slug>.");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = tgApi("getUpdates") + `?offset=${lastUpdateId + 1}&timeout=30`;
    const res = await fetch(url);
    const data = await res.json();
    const updates = Array.isArray(data.result) ? data.result : [];

    for (const update of updates) {
      lastUpdateId = Math.max(lastUpdateId, update.update_id ?? 0);
      const msg = update.message;
      if (!msg || String(msg.chat?.id) !== String(TELEGRAM_CHAT_ID)) {
        continue;
      }
      const text = String(msg.text ?? "").trim();
      const slug = parseArchiveCommand(text);
      if (!slug) {
        continue;
      }

      try {
        await archiveProject(slug);
        await sendMessage(`Archived project: ${slug}`);
      } catch (err) {
        await sendMessage(`Archive failed for ${slug}`);
      }
    }

    writeState({ lastUpdateId });
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
};

run().catch(async (err) => {
  console.error("[archive-bot]", err);
  try {
    await sendMessage(`Archive bot stopped: ${String(err)}`);
  } catch {
    // ignore
  }
  process.exit(1);
});
