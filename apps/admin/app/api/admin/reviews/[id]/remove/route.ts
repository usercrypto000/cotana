import { isAdminUser } from "@cotana/auth/authorization";
import { removeReview } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/session";
import { moderationActionSchema } from "../../../../../../lib/validation";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let rawPayload: unknown;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    rawPayload = await request.json();
  } else {
    const formData = await request.formData();
    rawPayload = {
      reason: formData.get("reason")
    };
  }

  const payload = moderationActionSchema.safeParse(rawPayload);

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const review = await removeReview(id, payload.data.reason);
  return NextResponse.json({ review });
}
