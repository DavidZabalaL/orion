import Link from "next/link";
import { requerirDevAdmin } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function ActividadLayout({ children }: { children: React.ReactNode }) {
  await requerirDevAdmin();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Analítica de Uso y Trazabilidad
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Módulo interno del equipo de Desarrollo — adopción de la plataforma y reconstrucción del historial de cambios.
        </p>
      </div>

      <div className="flex gap-2" data-no-print>
        <Link
          href="/admin/actividad"
          className="rounded-md px-4 h-9 flex items-center"
          style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
        >
          Adopción
        </Link>
        <Link
          href="/admin/actividad/trazabilidad"
          className="rounded-md px-4 h-9 flex items-center"
          style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", fontWeight: 600 }}
        >
          Trazabilidad
        </Link>
      </div>

      {children}
    </div>
  );
}
