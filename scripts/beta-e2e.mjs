import { pathToFileURL } from "node:url";

const runtimeProcess = globalThis.process;
const runtimeEnv = runtimeProcess?.env ?? {};
const defaultStoreUrl = runtimeEnv.COTANA_E2E_STORE_URL ?? "";
const defaultAdminUrl = runtimeEnv.COTANA_E2E_ADMIN_URL ?? "";
const defaultAppSlug = runtimeEnv.COTANA_E2E_APP_SLUG ?? "harbor-yield";
const required = runtimeEnv.COTANA_E2E_REQUIRED === "true";

function joinUrl(base, pathname) {
  return new URL(pathname, base.endsWith("/") ? base : `${base}/`).toString();
}

function result(input) {
  return {
    route: input.route,
    url: input.url,
    statusCode: input.statusCode ?? null,
    result: input.result,
    reason: input.reason,
    nextAction: input.nextAction ?? null
  };
}

async function request(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json, text/plain, text/html"
    },
    redirect: "manual"
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let body = null;

  if (contentType.includes("application/json")) {
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
  }

  return {
    response,
    statusCode: response.status,
    contentType,
    text,
    body
  };
}

function isProtectedHtml(check) {
  return (
    check.statusCode === 200 &&
    check.contentType.includes("text/html") &&
    (check.text.includes("Continue with") || check.text.includes("Sign Up") || check.text.includes("__VERCEL"))
  );
}

function isAdminShellHtml(check) {
  return (
    check.statusCode === 200 &&
    check.contentType.includes("text/html") &&
    (check.text.includes("Cotana Admin") || check.text.includes("Auth not configured") || check.text.includes("Privy not configured"))
  );
}

async function checkStatus(route, url, fetchImpl, expected = [200]) {
  const check = await request(url, fetchImpl);

  if (expected.includes(check.statusCode)) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "pass",
      reason: "Route returned an expected status.",
      nextAction: null
    });
  }

  return result({
    route,
    url,
    statusCode: check.statusCode,
    result: "fail",
    reason: `Route returned ${check.statusCode}, expected ${expected.join(" or ")}.`,
    nextAction: "Check deployment routing, data availability, or middleware protection."
  });
}

async function checkText(route, url, fetchImpl, expectedText) {
  const check = await request(url, fetchImpl);

  if (check.statusCode !== 200) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "fail",
      reason: `Route returned ${check.statusCode}.`,
      nextAction: "Check the deployed route and data dependency."
    });
  }

  if (!check.text.includes(expectedText)) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "fail",
      reason: `Response did not include ${expectedText}.`,
      nextAction: "Verify seeded beta data and page rendering."
    });
  }

  return result({
    route,
    url,
    statusCode: check.statusCode,
    result: "pass",
    reason: `Response included ${expectedText}.`,
    nextAction: null
  });
}

async function checkJson(route, url, fetchImpl, validate, warningWhen) {
  const check = await request(url, fetchImpl);

  if (check.statusCode < 200 || check.statusCode >= 300 || !check.body) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "fail",
      reason: `Route returned ${check.statusCode} without a valid JSON payload.`,
      nextAction: "Check the deployed route and environment configuration."
    });
  }

  if (!validate(check.body)) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "fail",
      reason: "JSON payload did not match the expected shape.",
      nextAction: "Check response contract or seeded data."
    });
  }

  const warning = warningWhen?.(check.body);

  if (warning) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "warn",
      reason: warning,
      nextAction: "Review the health dependency warnings before production promotion."
    });
  }

  return result({
    route,
    url,
    statusCode: check.statusCode,
    result: "pass",
    reason: "JSON payload matched the expected shape.",
    nextAction: null
  });
}

async function checkAdminProtected(route, url, fetchImpl) {
  const check = await request(url, fetchImpl);

  if ([401, 403, 307, 308].includes(check.statusCode) || isProtectedHtml(check)) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "pass",
      reason: "Admin preview is protected as expected.",
      nextAction: "Use an authenticated browser session for manual admin QA."
    });
  }

  if (isAdminShellHtml(check)) {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: "warn",
      reason: "Admin app is deployed, but unauthenticated health JSON is not available.",
      nextAction: "Verify admin health from an authenticated admin session after Privy preview config is present."
    });
  }

  if (check.body?.app === "cotana-admin") {
    return result({
      route,
      url,
      statusCode: check.statusCode,
      result: check.body.status === "ok" || check.body.status === "ok_with_warnings" ? "pass" : "warn",
      reason: `Admin health returned ${check.body.status}.`,
      nextAction: check.body.status === "ok" ? null : "Review admin health warnings in the authenticated admin session."
    });
  }

  return result({
    route,
    url,
    statusCode: check.statusCode,
    result: "fail",
    reason: "Admin preview was neither protected nor a valid health response.",
    nextAction: "Check Vercel protection and admin deployment routing."
  });
}

export async function runBetaChecks({
  storeUrl = defaultStoreUrl,
  adminUrl = defaultAdminUrl,
  appSlug = defaultAppSlug,
  fetchImpl = fetch
} = {}) {
  if (!storeUrl) {
    return [
      result({
        route: "Store URL",
        url: "",
        result: required ? "fail" : "warn",
        reason: "COTANA_E2E_STORE_URL is not set.",
        nextAction: "Set COTANA_E2E_STORE_URL to run beta URL checks."
      })
    ];
  }

  const checks = [
    await checkStatus("Store home", joinUrl(storeUrl, "/"), fetchImpl),
    await checkStatus("Store category", joinUrl(storeUrl, "/category/defi"), fetchImpl),
    await checkStatus("Store search page", joinUrl(storeUrl, "/search?q=yield&category=all&sort=relevance"), fetchImpl),
    await checkText("App detail Trust Profile", joinUrl(storeUrl, `/apps/${appSlug}`), fetchImpl, "Trust metadata"),
    await checkStatus("Agent registry discovery", joinUrl(storeUrl, "/.well-known/cotana-agent-registry"), fetchImpl),
    await checkStatus("Agent registry docs", joinUrl(storeUrl, "/agent-registry/docs"), fetchImpl),
    await checkStatus("llms.txt", joinUrl(storeUrl, "/llms.txt"), fetchImpl),
    await checkJson(
      "Store health",
      joinUrl(storeUrl, "/api/health"),
      fetchImpl,
      (body) => body?.app === "cotana-store" && ["ok", "ok_with_warnings"].includes(body?.status),
      (body) => (body.status === "ok_with_warnings" ? `${body.warnings?.length ?? 0} preview health warning(s).` : null),
    ),
    await checkJson(
      "Agent registry health",
      joinUrl(storeUrl, "/api/agent-registry/health"),
      fetchImpl,
      (body) => body?.app === "cotana-registry" && ["ok", "ok_with_warnings"].includes(body?.status),
      (body) => (body.status === "ok_with_warnings" ? `${body.warnings?.length ?? 0} registry health warning(s).` : null),
    ),
    await checkJson(
      "Store app records",
      joinUrl(storeUrl, "/api/apps"),
      fetchImpl,
      (body) => Array.isArray(body?.apps) && body.apps.length >= 15,
      null,
    ),
    await checkJson(
      "Search API",
      joinUrl(storeUrl, "/api/search?q=yield&category=all&sort=relevance"),
      fetchImpl,
      (body) => Array.isArray(body?.results),
      null,
    )
  ];

  if (adminUrl) {
    checks.push(await checkAdminProtected("Admin protected checklist", joinUrl(adminUrl, "/api/admin/launch-checklist"), fetchImpl));
    checks.push(await checkAdminProtected("Admin health", joinUrl(adminUrl, "/api/health"), fetchImpl));
  }

  return checks;
}

export function formatBetaCheckResults(results) {
  return results
    .map((entry) => {
      const statusCode = entry.statusCode === null ? "n/a" : String(entry.statusCode);
      const nextAction = entry.nextAction ? ` next=${entry.nextAction}` : " next=none";
      return `[${entry.result}] ${entry.route} status=${statusCode} reason=${entry.reason}${nextAction}`;
    })
    .join("\n");
}

export function hasBetaCheckFailure(results) {
  return results.some((entry) => entry.result === "fail");
}

async function main() {
  const results = await runBetaChecks();
  runtimeProcess.stdout.write(`${formatBetaCheckResults(results)}\n`);

  if (hasBetaCheckFailure(results)) {
    runtimeProcess.exitCode = 1;
  }
}

if (runtimeProcess?.argv?.[1] && import.meta.url === pathToFileURL(runtimeProcess.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    runtimeProcess.exitCode = 1;
  });
}
