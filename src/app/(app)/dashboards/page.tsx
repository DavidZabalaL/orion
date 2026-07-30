import Link from "next/link";
import { Settings2 } from "lucide-react";
import { requerirPermisoModulo } from "@/lib/permisos";
import { BiDashboardGrid } from "@/components/bi/bi-dashboard-grid";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  await requerirPermisoModulo("M");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Dashboards
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            BI de la plataforma — combinaciones ya curadas de unidades, mantenimiento, combustible y seguros.
          </p>
        </div>
        <Link href="/reportes/bi" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Settings2 size={16} /> Armar combinación personalizada
        </Link>
      </div>

      <BiDashboardGrid />
    </div>
  );
}
