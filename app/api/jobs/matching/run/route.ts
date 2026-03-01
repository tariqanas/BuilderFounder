import { NextResponse } from "next/server";
import { runMatchingEngine } from "@/lib/matching-engine";
import { isAuthorizedJobRequest } from "@/lib/jobs-auth";

export async function POST(request: Request) {
  if (!isAuthorizedJobRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMatchingEngine();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Matching failed" }, { status: 500 });
  }
}

export const GET = POST;
