import { prisma } from "@/lib/prisma";
import { calcularSlaPorUnidadesEnRango } from "@/lib/sla-disponibilidad";
import { obtenerPresupuestoDelMes, type ResumenPresupuestoMes } from "@/lib/presupuesto";
import { calcularCamposExtra } from "@/lib/reportes/campos-extra";
import type { CampoExtraSeleccionado, CampoExtraResultado } from "@/lib/reportes/campos-extra-tipos";
import type { EstatusUnidad, MotivoIndisponibilidad, CategoriaGasto, TipoVehiculo } from "@/generated/prisma/enums";

const DIA_MS = 24 * 60 * 60 * 1000;
const HORIZONTE_PROXIMO_SERVICIO_DIAS = 7;
const CATEGORIAS_MANTENIMIENTO: CategoriaGasto[] = ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"];

export type IndisponibilidadUnidad = {
  numeroEconomico: string;
  /** Marca + modelo del vehículo (ej. "Toyota Hilux") — null si la unidad no existe más en Unidad (caso raro, dato histórico). */
  vehiculo: string | null;
  tipoVehiculo: TipoVehiculo | null;
  motivo: MotivoIndisponibilidad | "SIN_MOTIVO";
  motivoDetalle: string | null;
  /** Solo cuando motivo=MANTENIMIENTO: categoría del último gasto de mantenimiento registrado de la unidad en el periodo, si existe. */
  tipoMantenimiento: CategoriaGasto | null;
};

export type ProximoServicio = {
  numeroEconomico: string;
  categoria: CategoriaGasto;
  fecha: Date;
};

/** Conteo de unidades activas por tipo de vehículo, para un proyecto — mismo desglose que el widget "Flota por tipo y zona" del dashboard. */
export type FlotaProyecto = {
  proyecto: string;
  porTipo: Partial<Record<TipoVehiculo, number>>;
  total: number;
};

export type EstatusFlota = {
  proyectoLabel: string;
  desde: Date;
  hasta: Date;
  slaPromedio: number | null;
  unidadesDisponibles: number;
  unidadesNoDisponibles: number;
  totalUnidades: number;
  porEstatus: { estatus: EstatusUnidad; cantidad: number }[];
  porMotivo: { motivo: MotivoIndisponibilidad | "SIN_MOTIVO"; cantidad: number }[];
  /** Desglose por unidad de las no disponibles — motivo, detalle y, si aplica, tipo de mantenimiento. */
  indisponibilidadDetalle: IndisponibilidadUnidad[];
  /** Unidades con mantenimiento programado (no realizado aún) dentro de los próximos 7 días desde `hasta`. */
  proximosServicios: ProximoServicio[];
  /** Flota activa (no BAJA) desglosada por proyecto y tipo de vehículo — igual que "Flota por tipo y zona" del dashboard. Un renglón por proyecto con al menos una unidad en este alcance. */
  flotaPorProyecto: FlotaProyecto[];
  gastoTotal: number;
  gastoPorCategoria: { categoria: CategoriaGasto; monto: number }[];
  /** Asignado vs. gastado del mes en curso (a la fecha `hasta`), para este alcance de proyectos. */
  presupuestoMes: ResumenPresupuestoMes;
  /** Checklists (cualquier tipo) capturados por día en promedio, en unidades de este alcance, dentro de [desde, hasta]. */
  checklistsPromedioDiario: number;
  /** Datos adicionales elegidos libremente por quien configuró el reporte — ver src/lib/reportes/campos-extra.ts. */
  camposExtra: CampoExtraResultado[];
};

/**
 * Calcula los 5 bloques del reporte de "Estatus semanal de flota" (SLA,
 * disponibilidad, estatus, motivos de indisponibilidad, gastos) para un
 * alcance de proyectos y un rango de fechas arbitrarios — usado tanto por la
 * descarga/envío inmediato como por el envío automático programado (ver
 * src/lib/bi/motor-reportes.ts). `proyectoIds: null` = todas las unidades
 * ("General").
 */
export async function calcularEstatusFlota({
  proyectoIds,
  desde,
  hasta,
  proyectoLabel,
  camposExtraSeleccionados = [],
}: {
  proyectoIds: string[] | null;
  desde: Date;
  hasta: Date;
  proyectoLabel: string;
  /** Datos adicionales elegidos en el configurador del reporte — ver EstatusFlotaModal. */
  camposExtraSeleccionados?: CampoExtraSeleccionado[];
}): Promise<EstatusFlota> {
  const filtroProyecto = proyectoIds !== null ? { proyectoId: { in: proyectoIds } } : {};

  const unidades = await prisma.unidad.findMany({
    where: filtroProyecto,
    select: { numeroEconomico: true, estatus: true, marca: true, unidadModelo: true, tipoVehiculo: true, proyectoId: true, proyecto: { select: { nombre: true } } },
  });
  const economicos = unidades.map((u) => u.numeroEconomico);
  const infoPorEconomico = new Map(unidades.map((u) => [u.numeroEconomico, u]));

  // Flota por proyecto y tipo — mismo desglose que "Flota por tipo y zona"
  // del dashboard: solo unidades activas (no BAJA), agrupadas por proyecto.
  const flotaPorProyectoMapa = new Map<string, Partial<Record<TipoVehiculo, number>>>();
  for (const u of unidades) {
    if (u.estatus === "BAJA") continue;
    const etiquetaProyecto = u.proyecto?.nombre ?? "Sin proyecto";
    const porTipo = flotaPorProyectoMapa.get(etiquetaProyecto) ?? {};
    porTipo[u.tipoVehiculo] = (porTipo[u.tipoVehiculo] ?? 0) + 1;
    flotaPorProyectoMapa.set(etiquetaProyecto, porTipo);
  }
  const flotaPorProyecto: FlotaProyecto[] = Array.from(flotaPorProyectoMapa, ([proyecto, porTipo]) => ({
    proyecto,
    porTipo,
    total: Object.values(porTipo).reduce((a, b) => a + (b ?? 0), 0),
  })).sort((a, b) => b.total - a.total);

  // Estatus de flota: es un estado actual (no hay historico de `estatus`,
  // solo de `disponibilidad`), igual criterio que los widgets de /unidades.
  const porEstatusMapa = new Map<EstatusUnidad, number>();
  for (const u of unidades) porEstatusMapa.set(u.estatus, (porEstatusMapa.get(u.estatus) ?? 0) + 1);
  const porEstatus = Array.from(porEstatusMapa, ([estatus, cantidad]) => ({ estatus, cantidad }));

  // Disponibilidad y motivo "a la fecha `hasta`": se leen del histórico (el
  // periodo abierto en ese momento), no del estado actual de Unidad — así el
  // reporte de un periodo pasado no queda contaminado por cambios recientes.
  // Sin periodo cubriendo `hasta` = nunca se ha apagado antes de esa fecha =
  // disponible (el default de Unidad.disponibilidad).
  const economicosNoBaja = unidades.filter((u) => u.estatus !== "BAJA").map((u) => u.numeroEconomico);
  const periodos = economicosNoBaja.length > 0
    ? await prisma.historicoDisponibilidadUnidad.findMany({
        where: { numeroEconomico: { in: economicosNoBaja }, desde: { lte: hasta }, OR: [{ hasta: null }, { hasta: { gt: hasta } }] },
        orderBy: { desde: "desc" },
        select: { numeroEconomico: true, disponible: true, motivo: true, motivoDetalle: true },
      })
    : [];
  const periodoPorEconomico = new Map<string, { disponible: boolean; motivo: MotivoIndisponibilidad | null; motivoDetalle: string | null }>();
  for (const p of periodos) {
    if (!periodoPorEconomico.has(p.numeroEconomico)) periodoPorEconomico.set(p.numeroEconomico, { disponible: p.disponible, motivo: p.motivo, motivoDetalle: p.motivoDetalle });
  }

  let unidadesDisponibles = 0;
  const porMotivoMapa = new Map<MotivoIndisponibilidad | "SIN_MOTIVO", number>();
  const noDisponibles: { numeroEconomico: string; motivo: MotivoIndisponibilidad | "SIN_MOTIVO"; motivoDetalle: string | null }[] = [];
  for (const numeroEconomico of economicosNoBaja) {
    const periodo = periodoPorEconomico.get(numeroEconomico);
    const disponible = periodo?.disponible ?? true;
    if (disponible) {
      unidadesDisponibles++;
    } else {
      const motivo = periodo?.motivo ?? "SIN_MOTIVO";
      porMotivoMapa.set(motivo, (porMotivoMapa.get(motivo) ?? 0) + 1);
      noDisponibles.push({ numeroEconomico, motivo, motivoDetalle: periodo?.motivoDetalle ?? null });
    }
  }
  const unidadesNoDisponibles = economicosNoBaja.length - unidadesDisponibles;
  const porMotivo = Array.from(porMotivoMapa, ([motivo, cantidad]) => ({ motivo, cantidad }));

  // Para las no disponibles por MANTENIMIENTO, se cruza con GastoVehicular
  // del periodo para saber si fue preventivo o correctivo — el histórico de
  // disponibilidad no distingue el tipo, solo GastoVehicular lo tiene.
  const economicosEnMantenimiento = noDisponibles.filter((n) => n.motivo === "MANTENIMIENTO").map((n) => n.numeroEconomico);
  const mantenimientosDelPeriodo = economicosEnMantenimiento.length > 0
    ? await prisma.gastoVehicular.findMany({
        where: { numeroEconomico: { in: economicosEnMantenimiento }, categoria: { in: CATEGORIAS_MANTENIMIENTO }, fecha: { gte: desde, lte: hasta } },
        orderBy: { fecha: "desc" },
        select: { numeroEconomico: true, categoria: true },
      })
    : [];
  const tipoMantenimientoPorEconomico = new Map<string, CategoriaGasto>();
  for (const m of mantenimientosDelPeriodo) {
    if (m.numeroEconomico && !tipoMantenimientoPorEconomico.has(m.numeroEconomico)) tipoMantenimientoPorEconomico.set(m.numeroEconomico, m.categoria);
  }
  const indisponibilidadDetalle: IndisponibilidadUnidad[] = noDisponibles.map((n) => ({
    ...n,
    vehiculo: (() => {
      const info = infoPorEconomico.get(n.numeroEconomico);
      return info ? `${info.marca} ${info.unidadModelo}` : null;
    })(),
    tipoVehiculo: infoPorEconomico.get(n.numeroEconomico)?.tipoVehiculo ?? null,
    tipoMantenimiento: n.motivo === "MANTENIMIENTO" ? (tipoMantenimientoPorEconomico.get(n.numeroEconomico) ?? null) : null,
  }));

  // Mantenimiento programado (aún no realizado) dentro de los próximos 7 días
  // desde el corte del reporte — para anticipar servicios de la semana siguiente.
  const proximosServiciosRaw = economicosNoBaja.length > 0
    ? await prisma.gastoVehicular.findMany({
        where: {
          numeroEconomico: { in: economicosNoBaja },
          categoria: { in: CATEGORIAS_MANTENIMIENTO },
          estatus: "PROGRAMADO",
          fecha: { gte: hasta, lte: new Date(hasta.getTime() + HORIZONTE_PROXIMO_SERVICIO_DIAS * DIA_MS) },
        },
        orderBy: { fecha: "asc" },
        select: { numeroEconomico: true, categoria: true, fecha: true },
      })
    : [];
  const proximosServicios: ProximoServicio[] = proximosServiciosRaw
    .filter((p): p is { numeroEconomico: string; categoria: CategoriaGasto; fecha: Date } => p.numeroEconomico !== null)
    .map((p) => ({ numeroEconomico: p.numeroEconomico, categoria: p.categoria, fecha: p.fecha }));

  // SLA promedio del periodo — mismo motor que ya usa /unidades, solo que
  // aquí el rango es el elegido en vez del mes en curso.
  const slaPorUnidad = await calcularSlaPorUnidadesEnRango(economicosNoBaja, { desde, hasta });
  const porcentajesConDatos = Array.from(slaPorUnidad.values()).map((s) => s.porcentaje).filter((p): p is number => p !== null);
  const slaPromedio = porcentajesConDatos.length > 0
    ? Math.round((porcentajesConDatos.reduce((a, b) => a + b, 0) / porcentajesConDatos.length) * 10) / 10
    : null;

  // Gastos del periodo — combina las 3 fuentes reales de gasto vehicular:
  // GastoVehicular (mantenimiento y demás categorías capturables), más
  // Combustible.costo (cargas reales del Módulo D) y Tag.monto (peajes del
  // Módulo E), que antes quedaban fuera por completo: CASETAS nunca se
  // captura como GastoVehicular (su única fuente real es Tag), y GASOLINA ahí
  // es una captura manual aparte de la carga real registrada en Combustible.
  // Mismo patrón OR (unidad.proyectoId / proyectoReportanteId) que ya usan
  // /tag y /combustible para alcance por proyecto en modelos con ambos campos.
  const filtroProyectoGasto = proyectoIds !== null
    ? { OR: [{ unidad: { proyectoId: { in: proyectoIds } } }, { proyectoReportanteId: { in: proyectoIds } }] }
    : {};
  // Checklists/día promedio: cuenta simple de registros de las unidades de
  // este alcance dentro del rango, entre el número de días del rango.
  const diasPeriodo = Math.max(1, Math.round((hasta.getTime() - desde.getTime()) / DIA_MS));

  const [gastosPorCategoria, combustibleAgg, tagAgg, presupuestoMes, totalChecklists, camposExtra] = await Promise.all([
    prisma.gastoVehicular.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: desde, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.combustible.aggregate({
      where: { fecha: { gte: desde, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.tag.aggregate({
      where: { fecha: { gte: desde, lte: hasta }, ...filtroProyectoGasto },
      _sum: { monto: true },
    }),
    obtenerPresupuestoDelMes(proyectoIds, hasta),
    economicos.length > 0
      ? prisma.checklist.count({ where: { numeroEconomico: { in: economicos }, fecha: { gte: desde, lte: hasta } } })
      : Promise.resolve(0),
    calcularCamposExtra(camposExtraSeleccionados, proyectoIds),
  ]);
  const checklistsPromedioDiario = Math.round((totalChecklists / diasPeriodo) * 10) / 10;

  const gastoPorCategoriaMapa = new Map<CategoriaGasto, number>();
  for (const g of gastosPorCategoria) gastoPorCategoriaMapa.set(g.categoria, Number(g._sum.costo ?? 0));
  gastoPorCategoriaMapa.set("GASOLINA", (gastoPorCategoriaMapa.get("GASOLINA") ?? 0) + Number(combustibleAgg._sum.costo ?? 0));
  gastoPorCategoriaMapa.set("CASETAS", (gastoPorCategoriaMapa.get("CASETAS") ?? 0) + Number(tagAgg._sum.monto ?? 0));

  const gastoPorCategoria = Array.from(gastoPorCategoriaMapa, ([categoria, monto]) => ({ categoria, monto }))
    .filter((g) => g.monto > 0)
    .sort((a, b) => b.monto - a.monto);
  const gastoTotal = gastoPorCategoria.reduce((acc, g) => acc + g.monto, 0);

  return {
    proyectoLabel,
    desde,
    hasta,
    slaPromedio,
    unidadesDisponibles,
    unidadesNoDisponibles,
    totalUnidades: economicos.length,
    porEstatus,
    porMotivo,
    indisponibilidadDetalle,
    proximosServicios,
    flotaPorProyecto,
    gastoTotal,
    gastoPorCategoria,
    presupuestoMes,
    checklistsPromedioDiario,
    camposExtra,
  };
}

export type EstatusFlotaReporte = {
  desde: Date;
  hasta: Date;
  /** Alcance completo permitido (todos los proyectos del usuario, o toda la flota sin restricción) — siempre presente, sin importar qué se haya seleccionado. */
  general: EstatusFlota;
  /** Combinado de los proyectos seleccionados — null si no se seleccionó ninguno (el reporte entonces solo trae `general`). */
  seleccion: EstatusFlota | null;
  /** Un bloque por cada proyecto seleccionado, mismo orden que se seleccionaron. */
  porProyecto: EstatusFlota[];
};

/**
 * Reporte completo de "Estatus semanal de flota": resumen general, resumen
 * combinado de la selección y desglose individual por proyecto seleccionado —
 * un único cálculo reutilizado tanto por la descarga/envío inmediato como por
 * el envío automático programado (ver src/app/(app)/dashboards/actions.ts y
 * src/lib/bi/motor-reportes.ts).
 */
export async function calcularEstatusFlotaReporte({
  proyectoIdsPermitidos,
  proyectoIdsSeleccionados,
  desde,
  hasta,
  camposExtraSeleccionados = [],
}: {
  /** null = sin restricción de proyecto (Administrador/rol global, o el cron sin sesión). */
  proyectoIdsPermitidos: string[] | null;
  proyectoIdsSeleccionados: string[] | null;
  desde: Date;
  hasta: Date;
  camposExtraSeleccionados?: CampoExtraSeleccionado[];
}): Promise<EstatusFlotaReporte> {
  const seleccion = proyectoIdsSeleccionados ?? [];

  const proyectos = seleccion.length > 0
    ? await prisma.proyecto.findMany({ where: { id: { in: seleccion } }, select: { id: true, nombre: true } })
    : [];
  const nombrePorId = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const [general, seleccionCombinada, porProyecto] = await Promise.all([
    calcularEstatusFlota({ proyectoIds: proyectoIdsPermitidos, desde, hasta, proyectoLabel: "General", camposExtraSeleccionados }),
    // Con exactamente 1 proyecto seleccionado, el combinado sería idéntico al
    // desglose de ese único proyecto (solo con otro título) — se omite.
    seleccion.length > 1
      ? calcularEstatusFlota({ proyectoIds: seleccion, desde, hasta, proyectoLabel: `Selección (${seleccion.length} proyectos)`, camposExtraSeleccionados })
      : Promise.resolve(null),
    Promise.all(
      seleccion.map((id) => calcularEstatusFlota({ proyectoIds: [id], desde, hasta, proyectoLabel: nombrePorId.get(id) ?? id, camposExtraSeleccionados }))
    ),
  ]);

  return { desde, hasta, general, seleccion: seleccionCombinada, porProyecto };
}
