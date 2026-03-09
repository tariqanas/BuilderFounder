import { requireActiveSubscription, requireUser } from "@/lib/server-auth";
import { AppShell } from "@/components/app-shell";


export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  await requireActiveSubscription(user.id);

  return <AppShell authenticated={!!user}>{children}</AppShell>;
}
