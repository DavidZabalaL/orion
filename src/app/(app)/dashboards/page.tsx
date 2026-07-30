import Link from "next/link";
import { Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo, tienePermisoModulo } from "@/lib/permisos";
import { BiDashboardEditor, type VistaDashboard } from "@/components/bi/bi-dashboard-editor";
import type { WidgetDashboardBI } from "@/lib/bi/metadata";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  await requerirPermisoModulo("M");

  const [vistasDb, puedeEditar] = await Promise.all([
    prisma.vistaDashboardBI.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nombre: true, widgets: true } }),
    tienePermisoModulo("M", "editar"),
  ]);

  const vistas: VistaDashboard[] = vistasDb.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    widgets: v.widgets as unknown as WidgetDashboardBI[],
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4" data-no-print>
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Dashboards
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            BI de la plataforma — guarda tus propias vistas con las combinaciones que más uses.
          </p>
        </div>
        <Link href="/reportes/bi" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Settings2 size={16} /> Explorador libre
        </Link>
      </div>

      <BiDashboardEditor vistas={vistas} puedeEditar={puedeEditar} />
    </div>
  );
}
