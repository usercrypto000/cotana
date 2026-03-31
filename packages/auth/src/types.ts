export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN" | "DEVELOPER_PORTAL";
};
