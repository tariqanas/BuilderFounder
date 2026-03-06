import { NextResponse } from "next/server";
import { collectOffers } from "@/lib/offers-collector";
import { isAuthorizedCronRequest } from "@/lib/jobs-auth";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await collectOffers();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Ingestion failed" }, { status: 500 });
  }
}

export const POST = GET;
