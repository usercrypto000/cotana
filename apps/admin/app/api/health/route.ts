import { getLaunchHealth, getLaunchHealthHttpStatus } from "@cotana/db";
import { logServerError, logServerEvent } from "@cotana/config/runtime";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const health = await getLaunchHealth("admin");

    if (health.status !== "ok") {
      logServerEvent("warn", "Admin health endpoint returned degraded status.", {
        route: "/api/health",
        health
      });
    }

    return NextResponse.json(health, {
      status: getLaunchHealthHttpStatus(health.status)
    });
  } catch (error) {
    logServerError("Admin health endpoint failed.", error, {
      route: "/api/health"
    });
    return NextResponse.json({ status: "unhealthy" }, { status: 503 });
  }
}
