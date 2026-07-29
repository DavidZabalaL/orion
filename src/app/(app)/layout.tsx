import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import { obtenerModulosVisibles } from "@/lib/permisos";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/iniciar-sesion");

  const [notificaciones, modulosVisibles] = await Promise.all([
    obtenerNotificaciones(),
    obtenerModulosVisibles(),
  ]);

  return (
    <AppShell session={session} notificaciones={notificaciones} modulosVisibles={modulosVisibles}>
      {children}
    </AppShell>
  );
}
