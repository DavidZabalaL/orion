import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo, tienePermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { DashboardsUnificado } from "@/components/bi/dashboards-unificado";
import { resolverMetrica } from "@/lib/bi/metricas";
import type { MetricaDisponible } from "@/components/bi/bi-explorer";
import type { WidgetDashboardBI } from "@/lib/bi/metadata";
import type { VistaDashboard } from "@/components/bi/bi-dashboard-editor";
import type { CampoExtraSeleccionado } from "@/lib/reportes/campos-extra-tipos";
import { sanearOrdenSecciones } from "@/lib/reportes/estatus-flota-secciones";

export const dynamic = "force-dynamic";

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requerirPermisoModulo("M");
  const { tab } = await searchParams;

  const proyectosPermitidos = await proyectosPermitidosParaModulo("M");
  const [vistasDb, puedeEditar, proyectosDisponibles, metricas, reporteEstatusFlota] = await Promise.all([
    prisma.vistaDashboardBI.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nombre: true, widgets: true } }),
    tienePermisoModulo("M", "editar"),
    prisma.proyecto.findMany({
      where: proyectosPermitidos === null ? undefined : { id: { in: proyectosPermitidos } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.metricaBI.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.reporteProgramado.findFirst({ where: { tipo: "estatus_flota" } }),
  ]);

  const filtrosEstatusFlota = reporteEstatusFlota?.filtrosJson as { proyectoIds?: string[] | null; camposExtra?: CampoExtraSeleccionado[]; ordenSecciones?: unknown } | null;
  const configEstatusFlota = {
    id: reporteEstatusFlota?.id ?? null,
    proyectoIds: filtrosEstatusFlota?.proyectoIds ?? [],
    hora: reporteEstatusFlota?.hora ?? "08",
    diaSemana: reporteEstatusFlota?.diaSemana ?? 1,
    periodoDias: reporteEstatusFlota?.periodoDias ?? 7,
    destinatarios: Array.isArray(reporteEstatusFlota?.destinatarios) ? (reporteEstatusFlota.destinatarios as string[]) : [],
    activo: reporteEstatusFlota?.activo ?? false,
    camposExtra: filtrosEstatusFlota?.camposExtra ?? [],
    ordenSecciones: sanearOrdenSecciones(filtrosEstatusFlota?.ordenSecciones),
  };

  const vistas: VistaDashboard[] = vistasDb.map((v) => ({
    id: v.id,
    nombre: v.nombre,
    widgets: v.widgets as unknown as WidgetDashboardBI[],
  }));

  const metricasDisponibles: MetricaDisponible[] = metricas
    .map((m) => {
      const resuelta = resolverMetrica(m);
      if (!resuelta) return null;
      return { id: m.id, nombre: m.nombre, datasetId: resuelta.datasetId, campoId: resuelta.campoId, agregacion: resuelta.agregacion, filtrosBase: resuelta.filtrosBase };
    })
    .filter((m): m is MetricaDisponible => m !== null);

  return (
    <DashboardsUnificado
      vistas={vistas}
      puedeEditar={puedeEditar}
      proyectosDisponibles={proyectosDisponibles}
      metricasDisponibles={metricasDisponibles}
      tabInicial={tab === "explorador" ? "explorador" : "propios"}
      configEstatusFlota={configEstatusFlota}
    />
  );
}
