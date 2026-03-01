import { NextResponse } from "next/server";
import { collectOffers } from "@/lib/offers-collector";
import { isAuthorizedJobRequest } from "@/lib/jobs-auth";

export async function POST(request: Request) {
  if (!isAuthorizedJobRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectOffers();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Collect failed" }, { status: 500 });
  }
}

export const GET = POST;
