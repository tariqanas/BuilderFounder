import { NextResponse } from "next/server";
import { createCheckoutSession, createCustomer } from "@/lib/stripe";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";

export async function POST() {
  const { user } = await requireUser();
  if (!user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getUserClientOrRedirect();
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = existing?.stripe_customer_id ?? (await createCustomer(user.email, user.id));
  const session = await createCheckoutSession(customerId, user.id);

  return NextResponse.redirect(session.url, { status: 303 });
}
