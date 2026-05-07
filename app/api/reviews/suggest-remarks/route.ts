import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { suggestManagerRemarks } from "@/lib/review-ai/suggest-remarks";
import { getOrgAccess } from "@/lib/org-context";

export async function POST(req: NextRequest) {
  try {
    const access = await getOrgAccess();
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "hr", "manager", "tl"].includes(access.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const result = await suggestManagerRemarks(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
