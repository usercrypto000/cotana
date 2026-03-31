import { isAdminUser } from "@cotana/auth/authorization";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@cotana/auth/session";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionUser = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!isAdminUser(sessionUser)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs"
};
