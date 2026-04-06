import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server-auth";
import { consumeManualRefresh, getManualRefreshStatus } from "@/lib/manual-radar-refresh";
import { runMatchingForUser } from "@/lib/matching-engine";

export async function GET() {
  const { user } = await requireUser();
  const status = await getManualRefreshStatus(user.id);

  return NextResponse.json({
    remaining: status.remaining,
    limit: status.limit,
  });
}

export async function POST() {
  const { user } = await requireUser();

  const status = await consumeManualRefresh(user.id);
  if (!status.allowed) {
    return NextResponse.json({ error: "Daily limit reached", remaining: 0, limit: status.limit }, { status: 429 });
  }

  try {
    const result = await runMatchingForUser(user.id);
    return NextResponse.json({
      success: true,
      remaining: status.remaining,
      limit: status.limit,
      createdMissions: result.createdMissions ?? 0,
      usersProcessed: result.usersProcessed ?? 0,
    });
  } catch (error) {
    console.error("[radar-refresh] scoped_user_matching_failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        success: false,
        error: "Matching failed",
        remaining: status.remaining,
        limit: status.limit,
      },
      { status: 500 }
    );
  }
}
