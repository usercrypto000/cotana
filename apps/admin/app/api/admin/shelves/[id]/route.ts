import { isAdminUser } from "@cotana/auth/authorization";
import { getAdminEditorialShelfById, updateEditorialShelf } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";
import { editorialShelfPayloadSchema } from "../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const shelf = await getAdminEditorialShelfById(id);

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found." }, { status: 404 });
  }

  return NextResponse.json({ shelf });
}

export async function PATCH(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = editorialShelfPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const shelf = await updateEditorialShelf(id, payload.data);

  if (!shelf) {
    return NextResponse.json({ error: "Shelf not found." }, { status: 404 });
  }

  return NextResponse.json({ shelf });
}
