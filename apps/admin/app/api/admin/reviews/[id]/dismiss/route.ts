import { isAdminUser } from "@cotana/auth/authorization";
import { dismissReviewFlags } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../../lib/session";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const review = await dismissReviewFlags(id);
  return NextResponse.json({ review });
}
