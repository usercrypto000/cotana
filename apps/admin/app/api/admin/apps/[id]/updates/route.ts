import { isAdminUser } from "@cotana/auth/authorization";
import { createAppUpdate, listAppUpdates } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/session";
import { appUpdatePayloadSchema } from "../../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const updates = await listAppUpdates(id);
  return NextResponse.json({ updates });
}

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = appUpdatePayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const update = await createAppUpdate(id, payload.data);
  return NextResponse.json({ update }, { status: 201 });
}
