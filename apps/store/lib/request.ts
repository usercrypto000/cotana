export function getRequestIdentity(request: Request, userId?: string | null) {
  if (userId) {
    return userId;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "anonymous";

  return ip;
}
