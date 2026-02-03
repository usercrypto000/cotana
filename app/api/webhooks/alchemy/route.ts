import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  return new Response("webhooks are disabled; use the polling worker", { status: 410 });
}
