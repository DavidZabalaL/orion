import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { obtenerModulosVisibles, esDevAdmin } from "@/lib/permisos";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");
  // session.user.id vacío = sesión sin usuario resuelto, o forzada a cerrar
  // (ver el callback `session` en src/auth.ts) — se trata igual que no tener sesión.
  if (!session.user.id) redirect("/iniciar-sesion");

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
