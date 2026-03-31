import { isAdminUser } from "@cotana/auth/authorization";
import { NextResponse } from "next/server";
import { runEmbeddingRefresh } from "../../../../../../lib/jobs";
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
  const summary = await runEmbeddingRefresh(id, "app.updated");
  return NextResponse.json({ summary });
}
