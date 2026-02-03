import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const unauthorized = () =>
  new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Cotana Admin"',
    },
  });

const readBotToken = (request: NextRequest) => {
  const header = request.headers.get("x-admin-token");
  if (header) return header;
  const auth = request.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
};

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/admin/archive-project") {
    const expected = process.env.ADMIN_BOT_TOKEN ?? "";
    const token = readBotToken(request);
    if (expected && token === expected) {
      return NextResponse.next();
    }
  }

  const user = process.env.BASIC_AUTH_USER ?? "";
  const pass = process.env.BASIC_AUTH_PASS ?? "";
  if (!user || !pass) {
    return unauthorized();
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authHeader.slice("Basic ".length).trim();
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex < 0) {
    return unauthorized();
  }

  const incomingUser = decoded.slice(0, separatorIndex);
  const incomingPass = decoded.slice(separatorIndex + 1);

  if (incomingUser !== user || incomingPass !== pass) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
