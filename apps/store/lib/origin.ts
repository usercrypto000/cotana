import { headers } from "next/headers";

export async function getStoreOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";
}
