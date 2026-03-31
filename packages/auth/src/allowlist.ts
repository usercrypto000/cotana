const splitAllowlist = (value: string | undefined) =>
  value
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean) ?? [];

export function getAdminAllowlist() {
  return splitAllowlist(process.env.ADMIN_ALLOWLIST_EMAIL);
}

export function isAllowedAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminAllowlist().includes(email.toLowerCase());
}
