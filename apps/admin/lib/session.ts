import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@cotana/auth/session";

export async function getSessionUser() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
