import { SignJWT, jwtVerify } from "jose";
import { getRuntimeEnvironment } from "@cotana/config/runtime";
import { z } from "zod";
import type { SessionUser } from "./types";

export const SESSION_COOKIE_NAME = "cotana_session";

const sessionPayloadSchema = z.object({
  sub: z.string(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["USER", "ADMIN", "DEVELOPER_PORTAL"])
});

function getSessionSecret() {
  const env = getRuntimeEnvironment();
  const fallback = env.NODE_ENV === "production" ? undefined : "cotana-dev-session-secret";
  const secret = env.COTANA_SESSION_SECRET ?? fallback;

  if (!secret) {
    throw new Error("COTANA_SESSION_SECRET must be configured in production.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    const parsed = sessionPayloadSchema.safeParse({
      sub: payload.sub,
      email: payload.email ?? null,
      displayName: payload.displayName ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      role: payload.role
    });

    if (!parsed.success) {
      return null;
    }

    return {
      id: parsed.data.sub,
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      avatarUrl: parsed.data.avatarUrl,
      role: parsed.data.role
    };
  } catch {
    return null;
  }
}
