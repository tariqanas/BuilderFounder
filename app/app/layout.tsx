import { requireActiveSubscription, requireUser } from "@/lib/server-auth";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  await requireActiveSubscription(user.id);

  return <AppShell>{children}</AppShell>;
}
