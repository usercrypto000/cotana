import { isAdminUser } from "@cotana/auth/authorization";
import { deleteAppUpdate, listAppUpdates, updateAppUpdate } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../../lib/session";
import { appUpdatePayloadSchema } from "../../../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string; updateId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = appUpdatePayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { updateId } = await params;
  const update = await updateAppUpdate(updateId, payload.data);

  if (!update) {
    return NextResponse.json({ error: "Update not found." }, { status: 404 });
  }

  return NextResponse.json({ update });
}

export async function DELETE(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, updateId } = await params;
  const deleted = await deleteAppUpdate(updateId);

  if (!deleted) {
    return NextResponse.json({ error: "Update not found." }, { status: 404 });
  }

  const updates = await listAppUpdates(id);
  return NextResponse.json({ updates });
}
