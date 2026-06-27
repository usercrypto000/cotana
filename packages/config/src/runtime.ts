import { z } from "zod";

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalString = z.preprocess(normalizeOptionalString, z.string().min(1).optional());
const optionalUrl = z.preprocess(normalizeOptionalString, z.string().url().optional());
const requiredString = z.preprocess(normalizeOptionalString, z.string().min(1));
const requiredUrl = z.preprocess(normalizeOptionalString, z.string().url());
const optionalBoolean = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "") {
      return undefined;
    }

    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: optionalString,
    DIRECT_URL: optionalString,
    REDIS_URL: optionalUrl,
    NEXT_PUBLIC_STORE_URL: optionalUrl,
    NEXT_PUBLIC_ADMIN_URL: optionalUrl,
    NEXT_PUBLIC_REGISTRY_URL: optionalUrl,
    NEXT_PUBLIC_PRIVY_APP_ID: optionalString,
    NEXT_PUBLIC_PRIVY_CLIENT_ID: optionalString,
    PRIVY_APP_ID: optionalString,
    PRIVY_APP_SECRET: optionalString,
    PRIVY_VERIFICATION_KEY: optionalString,
    COTANA_SESSION_SECRET: optionalString,
    ADMIN_ALLOWLIST_EMAIL: optionalString,
    POSTHOG_KEY: optionalString,
    POSTHOG_HOST: requiredUrl.default("https://app.posthog.com"),
    INNGEST_EVENT_KEY: optionalString,
    INNGEST_SIGNING_KEY: optionalString,
    AI_GATEWAY_API_KEY: optionalString,
    AI_GATEWAY_BASE_URL: requiredUrl.default("https://ai-gateway.vercel.sh/v1"),
    AI_GATEWAY_EMBEDDING_MODEL: requiredString.default("openai/text-embedding-3-small"),
    VERCEL_OIDC_TOKEN: optionalString,
    OPENAI_API_KEY: optionalString,
    OPENAI_EMBEDDING_MODEL: requiredString.default("text-embedding-3-small"),
    DEFILLAMA_API_KEY: optionalString,
    COVALENT_API_KEY: optionalString,
    COVALENT_BASE_URL: requiredUrl.default("https://api.covalenthq.com/v1"),
    COVALENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
    COTANA_ENABLE_SIGNAL_PROVIDERS: optionalBoolean,
    COTANA_ENABLE_ANALYTICS: optionalBoolean,
    COTANA_SEED_LAUNCH_CATALOG: optionalBoolean,
    COTANA_SEED_WEAK_AGENT_FIXTURES: optionalBoolean,
    COTANA_STAGING_SEED_CONFIRM: optionalBoolean,
    COTANA_STAGING_SEED_LOADED: optionalBoolean,
    COTANA_CATALOG_COVERAGE_ACCEPTED: optionalBoolean,
    COTANA_REGISTRY_COVERAGE_ACCEPTED: optionalBoolean,
    COTANA_SMOKE_TESTS_PASSING: optionalBoolean,
    COTANA_E2E_TESTS_PASSING: optionalBoolean,
    COTANA_MIGRATION_STATUS_CHECKED: optionalBoolean,
    COTANA_PRODUCTION_SEED_GUARD_ACTIVE: optionalBoolean,
    COTANA_DOCS_UPDATED: optionalBoolean,
    COTANA_KNOWN_WARNINGS_ACKNOWLEDGED: optionalBoolean,
    COTANA_CONFIRM_PRODUCTION_IMPORT: optionalBoolean,
    VERCEL_GIT_COMMIT_SHA: optionalString,
    GIT_COMMIT_SHA: optionalString,
    COTANA_BUILD_VERSION: optionalString,
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional()
  })
  .passthrough();

type RuntimeEnvironment = z.infer<typeof environmentSchema>;

export type EnvironmentValidationStatus = "pass" | "warning" | "fail";

export type EnvironmentValidationCheck = {
  key: string;
  scope: string;
  status: EnvironmentValidationStatus;
  message: string;
  required: boolean;
};

export type EnvironmentValidationReport = {
  environment: RuntimeEnvironment["NODE_ENV"] | "invalid";
  status: EnvironmentValidationStatus;
  localFallbacks: string[];
  checks: EnvironmentValidationCheck[];
};

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";
  readonly status = 503;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ConfigurationError";
    this.details = details;
  }
}

export class ApplicationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly exposeMessage: boolean;
  readonly details?: Record<string, unknown>;

  constructor({
    message,
    code = "APPLICATION_ERROR",
    status = 500,
    exposeMessage = false,
    details
  }: {
    message: string;
    code?: string;
    status?: number;
    exposeMessage?: boolean;
    details?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
    this.exposeMessage = exposeMessage;
    this.details = details;
  }
}

let cachedEnvironment: RuntimeEnvironment | null = null;

export function getRuntimeEnvironment(source: NodeJS.ProcessEnv = process.env): RuntimeEnvironment {
  if (source === process.env && cachedEnvironment) {
    return cachedEnvironment;
  }

  const parsed = environmentSchema.parse(source);

  if (source === process.env) {
    cachedEnvironment = parsed;
  }

  return parsed;
}

export function isProductionEnvironment(source: NodeJS.ProcessEnv = process.env) {
  return getRuntimeEnvironment(source).NODE_ENV === "production";
}

function addPresenceCheck(
  checks: EnvironmentValidationCheck[],
  input: {
    env: Partial<RuntimeEnvironment>;
    key: keyof RuntimeEnvironment;
    scope: string;
    required: boolean;
    optionalMessage?: string;
  },
) {
  const present = Boolean(input.env[input.key]);

  checks.push({
    key: String(input.key),
    scope: input.scope,
    status: present ? "pass" : input.required ? "fail" : "warning",
    required: input.required,
    message: present
      ? `${String(input.key)} is configured.`
      : input.required
        ? `${String(input.key)} is required but missing.`
        : (input.optionalMessage ?? `${String(input.key)} is optional and not configured.`)
  });
}

export function validateRuntimeEnvironment(source: NodeJS.ProcessEnv = process.env): EnvironmentValidationReport {
  const parsed = environmentSchema.safeParse(source);

  if (!parsed.success) {
    return {
      environment: "invalid",
      status: "fail",
      localFallbacks: [],
      checks: parsed.error.issues.map((issue) => ({
        key: issue.path.join(".") || "environment",
        scope: "runtime",
        status: "fail",
        required: true,
        message: issue.message
      }))
    };
  }

  const env = parsed.data;
  const checks: EnvironmentValidationCheck[] = [];
  const preview = env.VERCEL_ENV === "preview";
  const production = env.NODE_ENV === "production" && !preview;
  const signalProvidersEnabled = env.COTANA_ENABLE_SIGNAL_PROVIDERS === true;
  const analyticsEnabled = production || env.COTANA_ENABLE_ANALYTICS === true;
  const gatewayOrLegacyEmbeddingConfigured = Boolean(
    env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.OPENAI_API_KEY,
  );

  addPresenceCheck(checks, { env, key: "DATABASE_URL", scope: "database", required: true });
  addPresenceCheck(checks, { env, key: "DIRECT_URL", scope: "database", required: production });
  addPresenceCheck(checks, {
    env,
    key: "REDIS_URL",
    scope: "redis",
    required: production,
    optionalMessage: "REDIS_URL is not configured; local in-memory fallback will be used."
  });
  addPresenceCheck(checks, { env, key: "NEXT_PUBLIC_STORE_URL", scope: "urls", required: production });
  addPresenceCheck(checks, { env, key: "NEXT_PUBLIC_ADMIN_URL", scope: "urls", required: production });
  addPresenceCheck(checks, {
    env,
    key: "NEXT_PUBLIC_REGISTRY_URL",
    scope: "urls",
    required: false,
    optionalMessage: "NEXT_PUBLIC_REGISTRY_URL is not configured; registry routes derive from the store URL."
  });
  addPresenceCheck(checks, {
    env,
    key: "ADMIN_ALLOWLIST_EMAIL",
    scope: "auth",
    required: production,
    optionalMessage: "ADMIN_ALLOWLIST_EMAIL is optional for public preview checks but required before admin QA and production promotion."
  });
  addPresenceCheck(checks, { env, key: "COTANA_SESSION_SECRET", scope: "auth", required: production });
  addPresenceCheck(checks, { env, key: "NEXT_PUBLIC_PRIVY_APP_ID", scope: "privy", required: production });
  addPresenceCheck(checks, {
    env,
    key: "NEXT_PUBLIC_PRIVY_CLIENT_ID",
    scope: "privy",
    required: false,
    optionalMessage: "NEXT_PUBLIC_PRIVY_CLIENT_ID is optional unless a Privy app client is configured."
  });
  addPresenceCheck(checks, { env, key: "PRIVY_APP_SECRET", scope: "privy", required: production });
  addPresenceCheck(checks, {
    env,
    key: "PRIVY_VERIFICATION_KEY",
    scope: "privy",
    required: false,
    optionalMessage: "PRIVY_VERIFICATION_KEY is optional; the Privy server SDK can resolve app signing keys when PRIVY_APP_SECRET is configured."
  });
  addPresenceCheck(checks, { env, key: "POSTHOG_KEY", scope: "analytics", required: analyticsEnabled });
  addPresenceCheck(checks, { env, key: "INNGEST_EVENT_KEY", scope: "jobs", required: production });
  addPresenceCheck(checks, { env, key: "INNGEST_SIGNING_KEY", scope: "jobs", required: production });
  checks.push({
    key: "AI_GATEWAY_API_KEY",
    scope: "embeddings",
    status: gatewayOrLegacyEmbeddingConfigured ? "pass" : production ? "fail" : "warning",
    required: production,
    message: gatewayOrLegacyEmbeddingConfigured
      ? "AI Gateway or legacy embedding credentials are configured."
      : production
        ? "AI Gateway credentials are required in production. Enable Vercel OIDC or set AI_GATEWAY_API_KEY."
        : "AI Gateway credentials are not configured; local deterministic embedding fallback will be used."
  });
  addPresenceCheck(checks, {
    env,
    key: "DEFILLAMA_API_KEY",
    scope: "providers",
    required: signalProvidersEnabled,
    optionalMessage: "DEFILLAMA_API_KEY is optional unless signal providers are enabled."
  });
  addPresenceCheck(checks, {
    env,
    key: "COVALENT_API_KEY",
    scope: "providers",
    required: signalProvidersEnabled,
    optionalMessage: "COVALENT_API_KEY is optional unless signal providers are enabled."
  });

  const localFallbacks = [
    !env.REDIS_URL && !production ? "redis_memory_cache" : null,
    !gatewayOrLegacyEmbeddingConfigured && !production ? "deterministic_embedding_fallback" : null,
    !env.POSTHOG_KEY && !analyticsEnabled ? "analytics_disabled" : null
  ].filter((entry): entry is string => Boolean(entry));
  const status: EnvironmentValidationStatus = checks.some((check) => check.status === "fail")
    ? "fail"
    : checks.some((check) => check.status === "warning")
      ? "warning"
      : "pass";

  return {
    environment: env.NODE_ENV,
    status,
    localFallbacks,
    checks
  };
}

export function getBuildMetadata(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);
  const version = env.COTANA_BUILD_VERSION ?? source.npm_package_version ?? "0.1.0";
  const commitHash = env.VERCEL_GIT_COMMIT_SHA ?? env.GIT_COMMIT_SHA ?? null;

  return {
    version,
    commitHash
  };
}

function assertKeysPresent(
  keys: Array<keyof RuntimeEnvironment>,
  source: NodeJS.ProcessEnv = process.env,
  details?: Record<string, unknown>,
) {
  const env = getRuntimeEnvironment(source);
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing required environment variables: ${missing.join(", ")}.`,
      {
        missing,
        ...details
      },
    );
  }

  return env;
}

export function requireCoreRuntimeEnv(source: NodeJS.ProcessEnv = process.env) {
  return assertKeysPresent(["DATABASE_URL"], source, {
    scope: "core"
  });
}

export function requireStoreRuntimeEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = assertKeysPresent(["DATABASE_URL"], source, {
    scope: "store"
  });

  if (env.NODE_ENV === "production") {
    assertKeysPresent(["NEXT_PUBLIC_STORE_URL", "COTANA_SESSION_SECRET"], source, {
      scope: "store",
      environment: env.NODE_ENV
    });
  }

  return env;
}

export function requireAdminRuntimeEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = assertKeysPresent(["DATABASE_URL"], source, {
    scope: "admin"
  });

  if (env.NODE_ENV === "production") {
    assertKeysPresent(["NEXT_PUBLIC_ADMIN_URL", "COTANA_SESSION_SECRET"], source, {
      scope: "admin",
      environment: env.NODE_ENV
    });
  }

  return env;
}

export function requirePrivyServerEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);
  const hasAppId = Boolean(env.PRIVY_APP_ID ?? env.NEXT_PUBLIC_PRIVY_APP_ID);

  if (!hasAppId || !env.PRIVY_APP_SECRET) {
    throw new ConfigurationError(
      "Privy server auth is not configured. Set PRIVY_APP_ID or NEXT_PUBLIC_PRIVY_APP_ID, plus PRIVY_APP_SECRET.",
      {
        hasAppId,
        hasAppSecret: Boolean(env.PRIVY_APP_SECRET),
        scope: "privy-server"
      },
    );
  }

  return env;
}

export function getPrivyClientConfig(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);
  const authEnabled = Boolean(env.NEXT_PUBLIC_PRIVY_APP_ID);

  if (!env.NEXT_PUBLIC_PRIVY_APP_ID && env.NEXT_PUBLIC_PRIVY_CLIENT_ID) {
    throw new ConfigurationError(
      "Privy client auth is partially configured. NEXT_PUBLIC_PRIVY_APP_ID must be set when NEXT_PUBLIC_PRIVY_CLIENT_ID is set.",
      {
        hasAppId: Boolean(env.NEXT_PUBLIC_PRIVY_APP_ID),
        hasClientId: Boolean(env.NEXT_PUBLIC_PRIVY_CLIENT_ID),
        scope: "privy-client"
      },
    );
  }

  return {
    appId: env.NEXT_PUBLIC_PRIVY_APP_ID ?? null,
    clientId: env.NEXT_PUBLIC_PRIVY_CLIENT_ID ?? null,
    authEnabled
  };
}

export function requireRedisEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);

  if (!env.REDIS_URL && env.NODE_ENV === "production") {
    throw new ConfigurationError("REDIS_URL must be configured in production.", {
      scope: "redis"
    });
  }

  return env;
}

export function requireInngestEnv(source: NodeJS.ProcessEnv = process.env) {
  return assertKeysPresent(["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"], source, {
    scope: "inngest"
  });
}

export function requirePostHogEnv(source: NodeJS.ProcessEnv = process.env) {
  return assertKeysPresent(["POSTHOG_KEY"], source, {
    scope: "posthog"
  });
}

export function requireSearchProviderEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);

  if (!env.AI_GATEWAY_API_KEY && !env.VERCEL_OIDC_TOKEN && !env.OPENAI_API_KEY) {
    throw new ConfigurationError("AI Gateway credentials are not configured. Enable Vercel OIDC or set AI_GATEWAY_API_KEY.", {
      scope: "search"
    });
  }

  return env;
}

export function requireSignalProviderEnv(source: NodeJS.ProcessEnv = process.env) {
  return assertKeysPresent(["COVALENT_API_KEY"], source, {
    scope: "signals"
  });
}

export function createApplicationError(input: ConstructorParameters<typeof ApplicationError>[0]) {
  return new ApplicationError(input);
}

function normalizeError(error: unknown) {
  if (error instanceof ConfigurationError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    };
  }

  if (error instanceof ApplicationError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: String(error)
  };
}

export function getErrorResponseMetadata(error: unknown) {
  if (error instanceof ConfigurationError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      exposeMessage: true
    };
  }

  if (error instanceof ApplicationError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      exposeMessage: error.exposeMessage
    };
  }

  return {
    message: "Internal server error.",
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    exposeMessage: false
  };
}

export function logServerEvent(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  context?: Record<string, unknown>,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  const line = JSON.stringify(payload);

  if (level === "debug") {
    console.debug(line);
    return;
  }

  if (level === "info") {
    console.info(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.error(line);
}

export function logServerError(message: string, error: unknown, context?: Record<string, unknown>) {
  logServerEvent("error", message, {
    ...context,
    error: normalizeError(error)
  });
}
