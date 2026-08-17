import Link from "next/link";
import { ChevronLeft, Sigma } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { BiExplorer, type MetricaDisponible } from "@/components/bi/bi-explorer";
import { resolverMetrica } from "@/lib/bi/metricas";

export const dynamic = "force-dynamic";

export default async function BiPage() {
  await requerirPermisoModulo("J");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("J");
  const [proyectosDisponibles, metricas] = await Promise.all([
    prisma.proyecto.findMany({
      where: proyectosPermitidos === null ? undefined : { id: { in: proyectosPermitidos } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.metricaBI.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const metricasDisponibles: MetricaDisponible[] = metricas
    .map((m) => {
      const resuelta = resolverMetrica(m);
      if (!resuelta) return null;
      return { id: m.id, nombre: m.nombre, datasetId: resuelta.datasetId, campoId: resuelta.campoId, agregacion: resuelta.agregacion, filtrosBase: resuelta.filtrosBase };
    })
    .filter((m): m is MetricaDisponible => m !== null);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
            <ChevronLeft size={15} /> Volver al dashboard
          </Link>
          <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Explorador de BI
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Combina cualquier dimensión (eje X) con cualquier métrica (eje Y) de los módulos ya etiquetados.
          </p>
        </div>
        <Link
          href="/reportes/metricas"
          className="flex items-center gap-1.5 rounded-md px-3 py-2 shrink-0"
          style={{ background: "var(--chip)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)" }}
        >
          <Sigma size={14} /> Métricas de negocio
        </Link>
      </div>

      <BiExplorer proyectosDisponibles={proyectosDisponibles} metricasDisponibles={metricasDisponibles} />
    </div>
  );
}
