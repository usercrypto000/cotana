import { isAdminUser } from "@cotana/auth/authorization";
import { createEditorialShelf, listAdminEditorialShelves } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";
import { editorialShelfPayloadSchema } from "../../../../lib/validation";

export async function GET() {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shelves = await listAdminEditorialShelves();
  return NextResponse.json({ shelves });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = editorialShelfPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const shelf = await createEditorialShelf(payload.data);
  return NextResponse.json({ shelf }, { status: 201 });
}
