import { isAdminUser } from "@cotana/auth/authorization";
import { createAdminApp, listAdminApps, setAdminAppStatus } from "@cotana/db";
import { NextResponse } from "next/server";
import { safeSendInngestEvent } from "../../../../lib/inngest";
import { getSessionUser } from "../../../../lib/session";
import { adminAppPayloadSchema } from "../../../../lib/validation";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apps = await listAdminApps();
  return NextResponse.json({ apps });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = adminAppPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const app = await createAdminApp(payload.data, sessionUser.id);

  if (!app) {
    return NextResponse.json({ error: "Unable to create app." }, { status: 500 });
  }

  const finalApp =
    payload.data.status && payload.data.status !== app.status
      ? await setAdminAppStatus(app.id, payload.data.status)
      : app;

  if (finalApp) {
    void safeSendInngestEvent("app.created", { appId: finalApp.id });
  }

  return NextResponse.json({ app: finalApp }, { status: 201 });
}
