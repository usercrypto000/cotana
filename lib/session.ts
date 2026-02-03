import crypto from "node:crypto";

type SessionPayload = {
  email: string;
  exp: number;
};

const base64Url = (input: string) =>
  Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

export const signSession = (payload: SessionPayload, secret: string) => {
  const body = base64Url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return `${body}.${sig}`;
};

export const buildSessionCookie = (token: string, maxAgeSeconds: number) => {
  const secure = process.env.NODE_ENV === "production";
  return [
    `cotana_admin_session=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
};
