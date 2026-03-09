import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/app-url";
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
    return NextResponse.redirect(new URL("/billing", getAppUrl()));
  }

  const session = await createPortalSession(subscription.stripe_customer_id);
  return NextResponse.redirect(session.url, { status: 303 });
}
