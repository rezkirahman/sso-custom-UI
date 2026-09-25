import { NextResponse } from "next/server";

export async function GET() {
  // Liveness/Readiness probe ringan untuk Kubernetes
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "agforce-sso-ui"
  });
}
