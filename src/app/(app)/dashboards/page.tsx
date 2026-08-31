import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo, tienePermisoModulo, esRolGlobal, puedeVerSlaDisponibilidad } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";
import { DashboardsUnificado } from "@/components/bi/dashboards-unificado";
import { resolverMetrica } from "@/lib/bi/metricas";
import type { MetricaDisponible } from "@/components/bi/bi-explorer";
import type { WidgetDashboardBI } from "@/lib/bi/metadata";
import type { VistaDashboard } from "@/components/bi/bi-dashboard-editor";
import type { DatosInventarioTab } from "@/components/bi/dashboards-unificado";
import { type UnidadRow } from "@/components/unidades/unidades-table";
import { CATALOGO_WIDGETS_UNIDADES, WIDGETS_DEFAULT_UNIDADES, generarLayoutsPorDefecto, esLayoutValido, type WidgetConfigItem, type WidgetActivo } from "@/lib/widgets";
import { inicioDeHoyMx } from "@/lib/timezone";
import { calcularDiasSinOperar } from "@/lib/actividad-unidad";
import { calcularSlaMesActualPorUnidades } from "@/lib/sla-disponibilidad";
import { preferenciaOcultaPorUsuario, CLAVE_OCULTAR_SLA_DISPONIBILIDAD } from "@/lib/preferencias-usuario";

export const dynamic = "force-dynamic";

const CATEGORIAS_MANTENIMIENTO = ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"] as const;

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requerirPermisoModulo("M");
  const { tab } = await searchParams;

  const proyectosPermitidos = await proyectosPermitidosParaModulo("M");
  const [vistasDb, puedeEditar, proyectosDisponibles, metricas, puedeVerInventario, reporteEstatusFlota] = await Promise.all([
    prisma.vistaDashboardBI.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, nombre: true, widgets: true } }),
    tienePermisoModulo("M", "editar"),
    prisma.proyecto.findMany({
      where: proyectosPermitidos === null ? undefined : { id: { in: proyectosPermitidos } },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.metricaBI.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    tienePermisoModulo("A"),
    prisma.reporteProgramado.findFirst({ where: { tipo: "estatus_flota" } }),
  ]);

  const filtrosEstatusFlota = reporteEstatusFlota?.filtrosJson as { proyectoIds?: string[] | null } | null;
  const configEstatusFlota = {
    id: reporteEstatusFlota?.id ?? null,
    proyectoIds: filtrosEstatusFlota?.proyectoIds ?? null,
    hora: reporteEstatusFlota?.hora ?? "08",
    destinatarios: Array.isArray(reporteEstatusFlota?.destinatarios) ? (reporteEstatusFlota.destinatarios as string[]) : [],
    activo: reporteEstatusFlota?.activo ?? false,
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

  const datosInventario = puedeVerInventario ? await obtenerDatosInventario() : undefined;

  return (
    <DashboardsUnificado
      vistas={vistas}
      puedeEditar={puedeEditar}
      proyectosDisponibles={proyectosDisponibles}
      metricasDisponibles={metricasDisponibles}
      tabInicial={tab === "explorador" ? "explorador" : tab === "inventario" ? "inventario" : "propios"}
      datosInventario={datosInventario}
      configEstatusFlota={configEstatusFlota}
    />
  );
}

/**
 * Mismo fetching + cómputo que src/app/(app)/unidades/page.tsx — duplicado
 * intencionalmente aquí (en vez de extraído a un helper compartido) para no
 * tocar ni una línea de ese módulo, que el usuario pidió dejar intacto.
 */
async function obtenerDatosInventario(): Promise<DatosInventarioTab> {
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A");
  const restriccionOperador = await unidadRestringidaParaOperador();
  const filtroOperador = restriccionOperador.esOperador ? { numeroEconomico: { in: restriccionOperador.numerosEconomicos } } : {};

  const treintaDias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [unidades, ultimosMantenimientos, proximosMantenimientos, ultimosCombustibles, ultimosTags, ultimosGps, segurosProximos] = await Promise.all([
    prisma.unidad.findMany({
      where: { ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}), ...filtroOperador },
      include: {
        proyecto: { select: { nombre: true, estadoRepublica: true } },
        resguardante: { select: { nombre: true } },
      },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["numeroEconomico"],
      where: { categoria: { in: [...CATEGORIAS_MANTENIMIENTO] }, estatus: { in: ["REALIZADO", "PAGADO"] } },
      _max: { fecha: true },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["numeroEconomico"],
      where: { categoria: { in: [...CATEGORIAS_MANTENIMIENTO] }, estatus: "PROGRAMADO" },
      _min: { fecha: true },
    }),
    prisma.combustible.groupBy({ by: ["numeroEconomico"], _max: { fecha: true } }),
    prisma.tag.groupBy({ by: ["numeroEconomico"], where: { numeroEconomico: { not: null } }, _max: { fecha: true } }),
    prisma.posicionGPS.groupBy({ by: ["numeroEconomico"], _max: { timestamp: true } }),
    prisma.seguro.groupBy({
      by: ["numeroEconomico"],
      where: {
        fechaVencimiento: { lte: treintaDias, gte: new Date() },
        estatus: "VIGENTE",
        ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}),
      },
      _count: { id: true },
    }),
  ]);

  const ultimoPorEconomico = new Map(ultimosMantenimientos.map((m) => [m.numeroEconomico, m._max.fecha]));
  const proximoPorEconomico = new Map(proximosMantenimientos.map((m) => [m.numeroEconomico, m._min.fecha]));
  const ultimoCombustiblePorEconomico = new Map(ultimosCombustibles.map((m) => [m.numeroEconomico, m._max.fecha]));
  const ultimoTagPorEconomico = new Map(ultimosTags.map((m) => [m.numeroEconomico as string, m._max.fecha]));
  const ultimoGpsPorEconomico = new Map(ultimosGps.map((m) => [m.numeroEconomico, m._max.timestamp]));
  const conSeguroProximo = new Set(segurosProximos.map((s) => s.numeroEconomico));

  const rows: UnidadRow[] = unidades.map((u) => {
    const { diasSinOperar, origen, fuente } = calcularDiasSinOperar(
      u.disponibilidad,
      u.fechaCambioDisponibilidad,
      ultimoCombustiblePorEconomico.get(u.numeroEconomico),
      ultimoTagPorEconomico.get(u.numeroEconomico),
      ultimoGpsPorEconomico.get(u.numeroEconomico)
    );
    const semaforo: "verde" | "amarillo" | "rojo" = (() => {
      if (u.estatus !== "ACTIVO") return "rojo";
      if (!u.disponibilidad || diasSinOperar > 5 || conSeguroProximo.has(u.numeroEconomico)) return "amarillo";
      return "verde";
    })();
    return {
      numeroEconomico: u.numeroEconomico,
      placas: u.placas,
      tipoVehiculo: u.tipoVehiculo,
      marca: u.marca,
      unidadModelo: u.unidadModelo,
      proyecto: u.proyecto?.nombre ?? null,
      estatus: u.estatus,
      disponibilidad: u.disponibilidad,
      diasSinOperar,
      origenDiasSinOperar: origen,
      fuenteActividad: fuente,
      resguardante: u.resguardante?.nombre ?? null,
      ultimoMantenimiento: ultimoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
      proximoMantenimiento: proximoPorEconomico.get(u.numeroEconomico)?.toISOString() ?? null,
      semaforo,
      slaPorcentaje: null,
    };
  });

  const hoyInicio = inicioDeHoyMx();
  const [gastoHoyAgg, configWidgets, puedeConfigurar, puedeVerSla, slaOculto] = await Promise.all([
    prisma.gastoVehicular.aggregate({
      where: { fecha: { gte: hoyInicio }, ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}) },
      _sum: { costo: true },
    }),
    prisma.configuracionWidgets.findUnique({ where: { moduloId: "A" } }),
    esRolGlobal(),
    puedeVerSlaDisponibilidad(),
    preferenciaOcultaPorUsuario(CLAVE_OCULTAR_SLA_DISPONIBILIDAD),
  ]);

  const gastoHoy = Number(gastoHoyAgg._sum.costo ?? 0);

  if (puedeVerSla) {
    const slaPorUnidad = await calcularSlaMesActualPorUnidades(unidades.map((u) => u.numeroEconomico));
    for (const row of rows) {
      row.slaPorcentaje = slaPorUnidad.get(row.numeroEconomico)?.porcentaje ?? null;
    }
  }

  const widgetsGuardados = configWidgets?.widgets as WidgetConfigItem[] | undefined;
  const layoutsPorDefecto = generarLayoutsPorDefecto(CATALOGO_WIDGETS_UNIDADES);
  const widgetsActivos: WidgetActivo[] = CATALOGO_WIDGETS_UNIDADES
    .map((w) => {
      const guardado = widgetsGuardados?.find((g) => g.id === w.id);
      return {
        id: w.id,
        label: w.labelDefault,
        tipo: w.tipo,
        activo: guardado ? guardado.activo : WIDGETS_DEFAULT_UNIDADES.includes(w.id),
        layout: esLayoutValido(guardado?.layout) ? guardado.layout : layoutsPorDefecto[w.id],
      };
    })
    .filter((w) => w.activo && (w.id !== "slaPorProyecto" || puedeVerSla));

  return { rows, widgetsActivos, gastoHoy, puedeVerSla, slaOcultoInicial: slaOculto, puedeConfigurar };
}
