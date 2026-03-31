import { isAdminUser } from "@cotana/auth/authorization";
import { getAdminAppById, setAdminAppStatus, updateAdminApp } from "@cotana/db";
import { NextResponse } from "next/server";
import { safeSendInngestEvent } from "../../../../../lib/inngest";
import { getSessionUser } from "../../../../../lib/session";
import { adminAppPayloadSchema } from "../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const app = await getAdminAppById(id);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  return NextResponse.json({ app });
}

export async function PATCH(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = adminAppPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const app = await updateAdminApp(id, payload.data);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  const finalApp =
    payload.data.status && payload.data.status !== app.status
      ? await setAdminAppStatus(app.id, payload.data.status)
      : app;

  if (finalApp) {
    void safeSendInngestEvent("app.updated", { appId: finalApp.id });
  }

  return NextResponse.json({ app: finalApp });
}
