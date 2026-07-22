import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { obtenerNotificaciones } from "@/lib/notificaciones";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const notificaciones = await obtenerNotificaciones();

  return (
    <AppShell session={session} notificaciones={notificaciones}>
      {children}
    </AppShell>
  );
}
