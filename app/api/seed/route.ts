import { NextResponse } from "next/server";

import { runAutoSeed } from "@/lib/auto-seed";

const getSecret = (request: Request) => {
  const headerSecret = request.headers.get("x-seed-secret");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");
  return headerSecret ?? querySecret;
};

const validateSecret = (request: Request) => {
  const expected = process.env.SEED_SECRET;
  if (!expected) {
    return { ok: false, status: 500, message: "Missing SEED_SECRET env var." };
  }
  const provided = getSecret(request);
  if (!provided || provided !== expected) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }
  return { ok: true };
};

export async function POST(request: Request) {
  const validation = validateSecret(request);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message },
      { status: validation.status },
    );
  }

  try {
    const result = await runAutoSeed();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
