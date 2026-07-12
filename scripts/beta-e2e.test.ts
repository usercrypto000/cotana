import { describe, expect, it } from "vitest";
import { formatBetaCheckResults, hasBetaCheckFailure, runBetaChecks } from "./beta-e2e.mjs";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

function text(body: string, status = 200, contentType = "text/plain") {
  return new Response(body, {
    status,
    headers: {
      "content-type": contentType
    }
  });
}

describe("beta URL checker", () => {
  it("prints pass, warn, and protected admin results without false failures", async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("/api/health") && url.includes("store.example")) {
        return json({
          app: "cotana-store",
          status: "ok_with_warnings",
          warnings: [{ id: "redis" }, { id: "privy-client" }]
        });
      }

      if (url.includes("/api/agent-registry/health")) {
        return json({
          app: "cotana-registry",
          status: "ok_with_warnings",
          warnings: [{ id: "redis" }]
        });
      }

      if (url.includes("/api/apps")) {
        return json({
          apps: Array.from({ length: 15 }, (_, index) => ({ slug: `app-${index}` }))
        });
      }

      if (url.includes("/api/search")) {
        return json({ results: [] });
      }

      if (url.includes("admin.example")) {
        return text("<html><body>Continue with Email</body></html>", 200, "text/html");
      }

      if (url.includes("/apps/harbor-yield")) {
        return text("<main>Trust metadata</main>", 200, "text/html");
      }

      return text("ok");
    };

    const results = await runBetaChecks({
      storeUrl: "https://store.example",
      adminUrl: "https://admin.example",
      fetchImpl
    });
    const output = formatBetaCheckResults(results);

    expect(hasBetaCheckFailure(results)).toBe(false);
    expect(output).toContain("[warn] Store health status=200");
    expect(output).toContain("[pass] Admin protected checklist status=200");
    expect(output).toContain("Admin preview is protected as expected.");
  });

  it("warns when admin health returns the deployed admin shell instead of JSON", async () => {
    const results = await runBetaChecks({
      storeUrl: "https://store.example",
      adminUrl: "https://admin.example",
      fetchImpl: async (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("admin.example")) {
          return text("<html><body>Cotana Admin Auth not configured</body></html>", 200, "text/html");
        }

        if (url.includes("/api/health")) {
          return json({ app: "cotana-store", status: "ok" });
        }

        if (url.includes("/api/agent-registry/health")) {
          return json({ app: "cotana-registry", status: "ok" });
        }

        if (url.includes("/api/apps")) {
          return json({ apps: Array.from({ length: 15 }, (_, index) => ({ slug: `app-${index}` })) });
        }

        if (url.includes("/api/search")) {
          return json({ results: [] });
        }

        if (url.includes("/apps/harbor-yield")) {
          return text("<main>Trust metadata</main>", 200, "text/html");
        }

        return text("ok");
      }
    });

    const output = formatBetaCheckResults(results);

    expect(hasBetaCheckFailure(results)).toBe(false);
    expect(output).toContain("[warn] Admin health status=200");
    expect(output).toContain("unauthenticated health JSON is not available");
  });
});
