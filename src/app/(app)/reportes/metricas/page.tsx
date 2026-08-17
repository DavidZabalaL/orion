import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { MetricasManager, type MetricaFila } from "@/components/bi/metricas-manager";

export const dynamic = "force-dynamic";

export default async function MetricasBIPage() {
  await requerirPermisoModulo("M");

  const metricas = await prisma.metricaBI.findMany({
    orderBy: { createdAt: "desc" },
    include: { creadoPor: { select: { nombre: true } } },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div>
        <Link href="/dashboards?tab=explorador" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Dashboards
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Métricas de negocio
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Define de forma centralizada qué significa cada métrica (ej. &quot;costo por km&quot;) para que todos los dashboards la calculen igual.
        </p>
      </div>

      <MetricasManager metricas={metricas as unknown as MetricaFila[]} />
    </div>
  );
}
