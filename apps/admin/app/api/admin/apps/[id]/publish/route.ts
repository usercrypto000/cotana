import { isAdminUser } from "@cotana/auth/authorization";
import { setAdminAppStatus } from "@cotana/db";
import { NextResponse } from "next/server";
import { safeSendInngestEvent } from "../../../../../../lib/inngest";
import { AppStatus } from "../../../../../../lib/app-status";
import { getSessionUser } from "../../../../../../lib/session";
import { publishActionSchema } from "../../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = publishActionSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const nextStatus =
    payload.data.action === "publish"
      ? AppStatus.PUBLISHED
      : payload.data.action === "archive"
        ? AppStatus.ARCHIVED
        : AppStatus.DRAFT;

  const app = await setAdminAppStatus(id, nextStatus);

  if (!app) {
    return NextResponse.json({ error: "App not found." }, { status: 404 });
  }

  void safeSendInngestEvent("app.updated", { appId: app.id });

  return NextResponse.json({ app });
}
