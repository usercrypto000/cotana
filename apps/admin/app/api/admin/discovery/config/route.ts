import { isAdminUser } from "@cotana/auth/authorization";
import { updateDiscoveryConfig } from "@cotana/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";
import { discoveryConfigPayloadSchema } from "../../../../../lib/validation";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = discoveryConfigPayloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten().formErrors.join(", ") }, { status: 400 });
  }

  try {
    const valueJson = await updateDiscoveryConfig(payload.data.key, payload.data.valueJson);
    return NextResponse.json({
      key: payload.data.key,
      valueJson
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save config." },
      { status: 400 },
    );
  }
}
