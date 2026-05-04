import { NextResponse } from "next/server";

export function GET(): NextResponse<{ ok: true; service: string }> {
  return NextResponse.json({ ok: true, service: "reviewpilot" });
}
