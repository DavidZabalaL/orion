import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { obtenerModulosVisibles, esDevAdmin } from "@/lib/permisos";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const [notificaciones, modulosVisibles, devAdmin] = await Promise.all([
    obtenerNotificaciones(session.user.id),
    obtenerModulosVisibles(),
    esDevAdmin(),
  ]);

  return (
    <AppShell session={session} notificaciones={notificaciones} modulosVisibles={modulosVisibles} esDevAdmin={devAdmin}>
      {children}
    </AppShell>
  );
}
