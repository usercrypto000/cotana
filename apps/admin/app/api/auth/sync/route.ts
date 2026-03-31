import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { SESSION_COOKIE_NAME, createSessionToken, syncPrivyUser } from "@cotana/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const syncRequestSchema = z.object({
  identityToken: z.string().min(1)
});

export async function POST(request: Request) {
  const payload = syncRequestSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid auth payload." }, { status: 400 });
  }

  const { sessionUser, isNewUser } = await syncPrivyUser(payload.data.identityToken);
  const sessionToken = await createSessionToken(sessionUser);
  const response = NextResponse.json({ user: sessionUser });

  void trackServerEvent({
    event: isNewUser ? analyticsEvents.authSignedUp : analyticsEvents.authLoggedIn,
    distinctId: sessionUser.id,
    properties: {
      surface: "admin"
    }
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return response;
}
