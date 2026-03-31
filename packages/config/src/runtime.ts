import { z } from "zod";

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    DIRECT_URL: z.string().min(1).optional(),
    REDIS_URL: z.string().url().optional(),
    NEXT_PUBLIC_STORE_URL: z.string().url().optional(),
    NEXT_PUBLIC_ADMIN_URL: z.string().url().optional(),
    NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_PRIVY_CLIENT_ID: z.string().min(1).optional(),
    PRIVY_APP_ID: z.string().min(1).optional(),
    PRIVY_APP_SECRET: z.string().min(1).optional(),
    PRIVY_VERIFICATION_KEY: z.string().min(1).optional(),
    COTANA_SESSION_SECRET: z.string().min(1).optional(),
    ADMIN_ALLOWLIST_EMAIL: z.string().optional(),
    POSTHOG_KEY: z.string().min(1).optional(),
    POSTHOG_HOST: z.string().url().default("https://app.posthog.com"),
    INNGEST_EVENT_KEY: z.string().min(1).optional(),
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-large"),
    DEFILLAMA_API_KEY: z.string().min(1).optional(),
    DUNE_API_KEY: z.string().min(1).optional(),
    DUNE_DEFI_QUERY_ID: z.string().min(1).optional(),
    DUNE_LENDING_YIELD_QUERY_ID: z.string().min(1).optional(),
    DUNE_PREDICTION_MARKETS_QUERY_ID: z.string().min(1).optional()
  })
  .passthrough();

type RuntimeEnvironment = z.infer<typeof environmentSchema>;

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

  if (!hasAppId || !env.PRIVY_VERIFICATION_KEY) {
    throw new ConfigurationError(
      "Privy server auth is not configured. Set PRIVY_APP_ID or NEXT_PUBLIC_PRIVY_APP_ID, plus PRIVY_VERIFICATION_KEY.",
      {
        hasAppId,
        hasVerificationKey: Boolean(env.PRIVY_VERIFICATION_KEY),
        scope: "privy-server"
      },
    );
  }

  return env;
}

export function getPrivyClientConfig(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnvironment(source);
  const authEnabled = Boolean(env.NEXT_PUBLIC_PRIVY_APP_ID && env.NEXT_PUBLIC_PRIVY_CLIENT_ID);

  if (!authEnabled && (env.NEXT_PUBLIC_PRIVY_APP_ID || env.NEXT_PUBLIC_PRIVY_CLIENT_ID)) {
    throw new ConfigurationError(
      "Privy client auth is partially configured. NEXT_PUBLIC_PRIVY_APP_ID and NEXT_PUBLIC_PRIVY_CLIENT_ID must both be set.",
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
  return assertKeysPresent(["OPENAI_API_KEY"], source, {
    scope: "search"
  });
}

export function requireSignalProviderEnv(source: NodeJS.ProcessEnv = process.env) {
  return assertKeysPresent(
    ["DUNE_API_KEY", "DUNE_DEFI_QUERY_ID", "DUNE_LENDING_YIELD_QUERY_ID", "DUNE_PREDICTION_MARKETS_QUERY_ID"],
    source,
    {
      scope: "signals"
    },
  );
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
