import { isAllowedAdminEmail } from "./allowlist";
import type { SessionUser } from "./types";

export function isAdminUser(user: SessionUser | null | undefined) {
  if (!user) {
    return false;
  }

  return user.role === "ADMIN" || isAllowedAdminEmail(user.email);
}
