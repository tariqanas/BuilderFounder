import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { createPortalSession } from "@/lib/stripe";

export async function GET() {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/billing", env.APP_URL));
  }

  const session = await createPortalSession(subscription.stripe_customer_id);
  return NextResponse.redirect(session.url, { status: 303 });
}
