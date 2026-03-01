import { redirect } from "next/navigation";
import { getUserClientOrRedirect, requireUser } from "@/lib/server-auth";
import { AppShell } from "@/components/app-shell";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const supabase = await getUserClientOrRedirect();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();

  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  if (!isActive) {
    redirect("/billing");
  }

  return <AppShell>{children}</AppShell>;
}
