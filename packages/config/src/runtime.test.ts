import { describe, expect, it } from "vitest";
import { getBuildMetadata, validateRuntimeEnvironment } from "./runtime";

describe("runtime environment validation", () => {
  it("reports missing required launch environment values", () => {
    const report = validateRuntimeEnvironment({
      NODE_ENV: "production",
      COVALENT_TIMEOUT_MS: "10000"
    } as NodeJS.ProcessEnv);

    expect(report.status).toBe("fail");
    expect(report.checks.some((check) => check.key === "DATABASE_URL" && check.status === "fail")).toBe(true);
    expect(report.checks.some((check) => check.key === "NEXT_PUBLIC_STORE_URL" && check.status === "fail")).toBe(true);
  });

  it("reports invalid URLs and invalid numeric configuration", () => {
    const report = validateRuntimeEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/cotana",
      ADMIN_ALLOWLIST_EMAIL: "admin@cotana.app",
      REDIS_URL: "not-a-url",
      COVALENT_TIMEOUT_MS: "zero"
    } as NodeJS.ProcessEnv);

    expect(report.status).toBe("fail");
    expect(report.checks.some((check) => check.key === "REDIS_URL")).toBe(true);
    expect(report.checks.some((check) => check.key === "COVALENT_TIMEOUT_MS")).toBe(true);
  });

  it("reports local fallbacks without failing local development", () => {
    const report = validateRuntimeEnvironment({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost/cotana",
      ADMIN_ALLOWLIST_EMAIL: "admin@cotana.app",
      COVALENT_TIMEOUT_MS: "10000"
    } as NodeJS.ProcessEnv);

    expect(report.status).toBe("warning");
    expect(report.localFallbacks).toEqual(expect.arrayContaining(["redis_memory_cache", "deterministic_embedding_fallback"]));
  });

  it("treats Vercel preview as warning-only for production-only services", () => {
    const report = validateRuntimeEnvironment({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      DATABASE_URL: "postgresql://localhost/cotana",
      COVALENT_TIMEOUT_MS: "10000"
    } as NodeJS.ProcessEnv);

    expect(report.status).toBe("warning");
    expect(report.checks.some((check) => check.key === "REDIS_URL" && check.status === "warning")).toBe(true);
    expect(report.checks.some((check) => check.key === "NEXT_PUBLIC_PRIVY_APP_ID" && check.status === "warning")).toBe(
      true,
    );
  });

  it("keeps Vercel production strict for production-only services", () => {
    const report = validateRuntimeEnvironment({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      DATABASE_URL: "postgresql://localhost/cotana",
      COVALENT_TIMEOUT_MS: "10000"
    } as NodeJS.ProcessEnv);

    expect(report.status).toBe("fail");
    expect(report.checks.some((check) => check.key === "REDIS_URL" && check.status === "fail")).toBe(true);
    expect(report.checks.some((check) => check.key === "PRIVY_APP_SECRET" && check.status === "fail")).toBe(true);
  });

  it("reads build metadata from environment", () => {
    expect(
      getBuildMetadata({
        NODE_ENV: "test",
        COTANA_BUILD_VERSION: "launch-1",
        GIT_COMMIT_SHA: "abc123"
      } as NodeJS.ProcessEnv),
    ).toEqual({
      version: "launch-1",
      commitHash: "abc123"
    });
  });
});
