import { prisma } from "@/lib/prisma";
import { calcularSlaPorUnidadesEnRango } from "@/lib/sla-disponibilidad";
import { obtenerPresupuestoDelMes, type ResumenPresupuestoMes } from "@/lib/presupuesto";
import { calcularCamposExtra } from "@/lib/reportes/campos-extra";
import type { CampoExtraSeleccionado, CampoExtraResultado } from "@/lib/reportes/campos-extra-tipos";
import type {
  EstatusUnidad,
  MotivoIndisponibilidad,
  CategoriaGasto,
  TipoVehiculo,
  TipoSiniestro,
  EstatusSiniestro,
  EstatusGasto,
} from "@/generated/prisma/enums";

export {
  TIPO_SINIESTRO_LABEL,
  ESTATUS_SINIESTRO_LABEL,
  ESTATUS_GASTO_LABEL,
} from "@/lib/reportes/estatus-flota-labels";

export type SiniestroReporteItem = {
  id: string;
  folio: string;
  numeroEconomico: string;
  vehiculo: string | null;
  proyecto: string | null;
  fecha: Date;
  tipo: TipoSiniestro;
  estatus: EstatusSiniestro;
  costo: number | null;
  descripcion: string;
};

export type ApoyoReporteItem = {
  id: string;
  numeroEconomico: string | null;
  vehiculo: string | null;
  proyecto: string | null;
  departamento: "Compras" | "Finanzas" | "Sin departamento";
  categoria: CategoriaGasto;
  fecha: Date;
  costo: number;
  descripcion: string | null;
  proveedor: string | null;
  servicio: string | null;
  estatus: EstatusGasto;
  sc: string | null;
  odc: string | null;
  fechaPago: Date | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;
const HORIZONTE_PROXIMO_SERVICIO_DIAS = 7;
const CATEGORIAS_MANTENIMIENTO: CategoriaGasto[] = ["MANTENIMIENTO_PREVENTIVO", "MANTENIMIENTO_CORRECTIVO"];

export type IndisponibilidadUnidad = {
  numeroEconomico: string;
  /** Marca + modelo del vehículo (ej. "Toyota Hilux") — null si la unidad no existe más en Unidad (caso raro, dato histórico). */
  vehiculo: string | null;
  tipoVehiculo: TipoVehiculo | null;
  /** Nombre del proyecto al que pertenece la unidad — null si no tiene proyecto asignado. */
  proyecto: string | null;
  motivo: MotivoIndisponibilidad | "SIN_MOTIVO";
  motivoDetalle: string | null;
  /** Solo cuando motivo=MANTENIMIENTO: categoría del último gasto de mantenimiento registrado de la unidad en el periodo, si existe. */
  tipoMantenimiento: CategoriaGasto | null;
  /** Solo cuando motivo=MANTENIMIENTO: fecha de ingreso a taller del gasto más reciente del periodo, si existe. */
  fechaIngresoTaller: Date | null;
  /** Solo cuando motivo=MANTENIMIENTO: fecha estimada de salida del taller del gasto más reciente del periodo, si existe. */
  fechaEstimadaSalida: Date | null;
  /** Solo cuando motivo=MANTENIMIENTO: costo del gasto de mantenimiento más reciente del periodo, si existe. */
  costoMantenimiento: number | null;
};

export type ProximoServicio = {
  numeroEconomico: string;
  categoria: CategoriaGasto;
  fecha: Date;
  /** Nombre del proyecto al que pertenece la unidad — null si no tiene proyecto asignado. */
  proyecto: string | null;
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
  /** Mismo desglose que `gastoPorCategoria`, pero acotado al mes en curso (del 1° del mes de `hasta` a `hasta`) en vez del periodo completo del reporte — se muestra siempre junto al del periodo, para no confundir un periodo corto (ej. 7 días) con el gasto del mes. */
  gastoTotalMes: number;
  gastoPorCategoriaMes: { categoria: CategoriaGasto; monto: number }[];
  /** Asignado vs. gastado del mes en curso (a la fecha `hasta`), para este alcance de proyectos. */
  presupuestoMes: ResumenPresupuestoMes;
  /** Suma de Proyecto.presupuestoAprobadoAnual de los proyectos en este alcance — independiente del mes en curso (a diferencia de `presupuestoMes`). */
  presupuestoAnual: number;
  /** Gasto acumulado del año de `hasta` (del 1 de enero a `hasta`), mismas 3 fuentes que `gastoTotal` — se muestra junto a `presupuestoAnual` para comparar lo presupuestado contra lo realmente gastado en lo que va del año. */
  gastoAcumuladoAnio: number;
  /** Desglose por partida de `gastoAcumuladoAnio` (1 de enero del año de `hasta` a `hasta`). */
  gastoPorCategoriaAnio: { categoria: CategoriaGasto; monto: number }[];
  /** Total de checklists (cualquier tipo) registrados en el periodo [desde, hasta]. */
  totalChecklists: number;
  /** Checklists (cualquier tipo) capturados por día en promedio, en unidades de este alcance, dentro de [desde, hasta]. */
  checklistsPromedioDiario: number;
  /** Total de unidades activas que registraron movimiento en GPS (>= 1 km) en el periodo [desde, hasta]. */
  unidadesMovieron: number;
  /** Unidades que registraron movimiento Y completaron al menos un checklist semanal en el periodo [desde, hasta]. */
  unidadesConChecklistSemanal: number;
  /** Total de unidades con al menos un checklist semanal registrado en [desde, hasta] (incluyendo estáticas). */
  unidadesConChecklistSemanalTotal: number;
  /** Porcentaje de cumplimiento de checklists semanales respecto a las unidades que se movieron (0-100, o null si ninguna se movió). */
  pctChecklistSemanal: number | null;
  /** Siniestros registrados en el periodo [desde, hasta]. */
  siniestrosPeriodo: number;
  /** Siniestros acumulados en el año de `hasta` (1 de enero a `hasta`). */
  siniestrosAcumuladoAnio: number;
  /** Detalle de los siniestros ocurridos en el periodo del reporte. */
  siniestrosDetalle: SiniestroReporteItem[];
  /** Solicitudes de apoyo marcadas para el departamento de Compras. */
  apoyosCompras: ApoyoReporteItem[];
  /** Solicitudes de apoyo marcadas para el departamento de Finanzas. */
  apoyosFinanzas: ApoyoReporteItem[];
  /** Solicitudes de apoyo sin departamento específico asignado. */
  apoyosOtros: ApoyoReporteItem[];
  /** Total importe apoyos de compras. */
  totalApoyosCompras: number;
  /** Total importe apoyos de finanzas. */
  totalApoyosFinanzas: number;
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
        select: { numeroEconomico: true, categoria: true, fechaIngresoTaller: true, fechaEstimadaSalida: true, costo: true },
      })
    : [];
  const mantenimientoPorEconomico = new Map<string, { categoria: CategoriaGasto; fechaIngresoTaller: Date | null; fechaEstimadaSalida: Date | null; costo: number }>();
  for (const m of mantenimientosDelPeriodo) {
    if (m.numeroEconomico && !mantenimientoPorEconomico.has(m.numeroEconomico)) {
      mantenimientoPorEconomico.set(m.numeroEconomico, { categoria: m.categoria, fechaIngresoTaller: m.fechaIngresoTaller, fechaEstimadaSalida: m.fechaEstimadaSalida, costo: Number(m.costo) });
    }
  }
  const indisponibilidadDetalle: IndisponibilidadUnidad[] = noDisponibles.map((n) => {
    const mantenimiento = n.motivo === "MANTENIMIENTO" ? mantenimientoPorEconomico.get(n.numeroEconomico) : undefined;
    return {
      ...n,
      vehiculo: (() => {
        const info = infoPorEconomico.get(n.numeroEconomico);
        return info ? `${info.marca} ${info.unidadModelo}` : null;
      })(),
      tipoVehiculo: infoPorEconomico.get(n.numeroEconomico)?.tipoVehiculo ?? null,
      proyecto: infoPorEconomico.get(n.numeroEconomico)?.proyecto?.nombre ?? null,
      tipoMantenimiento: mantenimiento?.categoria ?? null,
      fechaIngresoTaller: mantenimiento?.fechaIngresoTaller ?? null,
      fechaEstimadaSalida: mantenimiento?.fechaEstimadaSalida ?? null,
      costoMantenimiento: mantenimiento?.costo ?? null,
    };
  });

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
    .map((p) => ({ numeroEconomico: p.numeroEconomico, categoria: p.categoria, fecha: p.fecha, proyecto: infoPorEconomico.get(p.numeroEconomico)?.proyecto?.nombre ?? null }));

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
  // Mes en curso "a la fecha `hasta`" — mismo criterio que obtenerPresupuestoDelMes,
  // para que el gasto por partida del mes y el presupuesto del mes hablen del
  // mismo rango exacto. Se calcula siempre (no solo cuando el periodo elegido
  // es "este mes"), para que el reporte nunca confunda el gasto de un periodo
  // corto (ej. 7 días) con el del mes completo.
  const inicioMes = new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), 1));
  // Acumulado del año de `hasta` — mismo criterio de rango que presupuestoAnual
  // (año de `hasta`, no el año en curso del servidor), para comparar lo
  // presupuestado contra lo gastado en lo que va de ese año.
  const inicioAnio = new Date(Date.UTC(hasta.getUTCFullYear(), 0, 1));

  const filtroProyectoSiniestro = proyectoIds !== null ? { unidad: { proyectoId: { in: proyectoIds } } } : {};

  const [
    gastosPorCategoria, combustibleAgg, tagAgg,
    gastosPorCategoriaMes, combustibleAggMes, tagAggMes,
    gastosPorCategoriaAnio, combustibleAnioAgg, tagAnioAgg,
    presupuestoMes, totalChecklists, camposExtra, presupuestoPartidaAgg,
    siniestrosPeriodoRaw, siniestrosAnioCount, apoyosRaw,
    posicionesGpsPeriodo, checklistsSemanalesRaw,
  ] = await Promise.all([
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
    prisma.gastoVehicular.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: inicioMes, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.combustible.aggregate({
      where: { fecha: { gte: inicioMes, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.tag.aggregate({
      where: { fecha: { gte: inicioMes, lte: hasta }, ...filtroProyectoGasto },
      _sum: { monto: true },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["categoria"],
      where: { fecha: { gte: inicioAnio, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.combustible.aggregate({
      where: { fecha: { gte: inicioAnio, lte: hasta }, ...filtroProyectoGasto },
      _sum: { costo: true },
    }),
    prisma.tag.aggregate({
      where: { fecha: { gte: inicioAnio, lte: hasta }, ...filtroProyectoGasto },
      _sum: { monto: true },
    }),
    obtenerPresupuestoDelMes(proyectoIds, hasta),
    economicos.length > 0
      ? prisma.checklist.count({ where: { numeroEconomico: { in: economicos }, fecha: { gte: desde, lte: hasta } } })
      : Promise.resolve(0),
    calcularCamposExtra(camposExtraSeleccionados, proyectoIds, desde, hasta),
    // Mismo dato que el widget "Presupuesto Anual" del dashboard (dataset BI
    // "presupuesto_partida"): suma de todas las partidas presupuestadas del
    // año de `hasta` — Proyecto.presupuestoAprobadoAnual existe en el schema
    // pero no se usa en la práctica (siempre 0), así que no sirve aquí.
    prisma.presupuestoPartida.aggregate({
      where: { anio: hasta.getFullYear(), ...(proyectoIds !== null ? { proyectoId: { in: proyectoIds } } : {}) },
      _sum: { montoPresupuestado: true },
    }),
    prisma.siniestro.findMany({
      where: { fecha: { gte: desde, lte: hasta }, ...filtroProyectoSiniestro },
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        folio: true,
        numeroEconomico: true,
        fecha: true,
        tipo: true,
        estatus: true,
        descripcion: true,
        costoReparacion: true,
        costoArrastre: true,
        estimacionDanos: true,
        unidad: { select: { marca: true, unidadModelo: true, proyecto: { select: { nombre: true } } } },
      },
    }),
    prisma.siniestro.count({
      where: { fecha: { gte: inicioAnio, lte: hasta }, ...filtroProyectoSiniestro },
    }),
    prisma.gastoVehicular.findMany({
      where: {
        ...filtroProyectoGasto,
        AND: [
          { OR: [{ apoyoPago: true }, { departamentoApoyoId: { not: null } }] },
          {
            OR: [
              { fecha: { gte: desde, lte: hasta } },
              { estatus: { not: "REALIZADO" }, fecha: { lte: hasta } },
            ],
          },
        ],
      },
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        numeroEconomico: true,
        categoria: true,
        descripcion: true,
        fecha: true,
        costo: true,
        proveedor: true,
        servicio: true,
        estatus: true,
        sc: true,
        odc: true,
        fechaPago: true,
        departamentoApoyo: { select: { nombre: true } },
        unidad: { select: { marca: true, unidadModelo: true, proyecto: { select: { nombre: true } } } },
        proyectoReportante: { select: { nombre: true } },
      },
    }),
    economicosNoBaja.length > 0
      ? prisma.posicionGPS.groupBy({
          by: ["numeroEconomico"],
          where: {
            numeroEconomico: { in: economicosNoBaja },
            timestamp: { gte: desde, lte: hasta },
            kmValidado: { not: null },
            esAnomalo: false,
          },
          _min: { kmValidado: true },
          _max: { kmValidado: true },
        })
      : Promise.resolve([]),
    economicosNoBaja.length > 0
      ? prisma.checklist.groupBy({
          by: ["numeroEconomico"],
          where: {
            numeroEconomico: { in: economicosNoBaja },
            tipo: "SEMANAL",
            fecha: { gte: desde, lte: hasta },
          },
        })
      : Promise.resolve([]),
  ]);
  const presupuestoAnual = Number(presupuestoPartidaAgg._sum.montoPresupuestado ?? 0);
  const checklistsPromedioDiario = Math.round((totalChecklists / diasPeriodo) * 10) / 10;

  // Umbral de 1 km para descartar ruido de GPS — misma lógica que el módulo de Checklists.
  const UMBRAL_MOVIMIENTO_KM = 1;
  const economicosMovidos = new Set(
    posicionesGpsPeriodo
      .filter(
        (p) =>
          p._min.kmValidado !== null &&
          p._max.kmValidado !== null &&
          p._max.kmValidado - p._min.kmValidado >= UMBRAL_MOVIMIENTO_KM
      )
      .map((p) => p.numeroEconomico)
  );
  const economicosConChecklistSemanal = new Set(checklistsSemanalesRaw.map((c) => c.numeroEconomico));
  const unidadesMovieron = economicosMovidos.size;
  const unidadesConChecklistSemanalTotal = economicosConChecklistSemanal.size;
  const unidadesConChecklistSemanal =
    unidadesMovieron > 0
      ? Array.from(economicosMovidos).filter((e) => economicosConChecklistSemanal.has(e)).length
      : unidadesConChecklistSemanalTotal;
  const pctChecklistSemanal =
    unidadesMovieron > 0
      ? Math.round((unidadesConChecklistSemanal / unidadesMovieron) * 100)
      : null;

  const siniestrosDetalle: SiniestroReporteItem[] = siniestrosPeriodoRaw.map((s) => {
    const reparacion = Number(s.costoReparacion ?? 0);
    const arrastre = Number(s.costoArrastre ?? 0);
    const totalCostos = reparacion + arrastre;
    const costo = totalCostos > 0 ? totalCostos : (s.estimacionDanos !== null ? Number(s.estimacionDanos) : null);
    return {
      id: s.id,
      folio: s.folio,
      numeroEconomico: s.numeroEconomico,
      vehiculo: s.unidad ? `${s.unidad.marca} ${s.unidad.unidadModelo}` : null,
      proyecto: s.unidad?.proyecto?.nombre ?? null,
      fecha: s.fecha,
      tipo: s.tipo,
      estatus: s.estatus,
      costo,
      descripcion: s.descripcion,
    };
  });

  const apoyosCompras: ApoyoReporteItem[] = [];
  const apoyosFinanzas: ApoyoReporteItem[] = [];
  const apoyosOtros: ApoyoReporteItem[] = [];

  for (const a of apoyosRaw) {
    const deptoNombre = a.departamentoApoyo?.nombre;
    const item: ApoyoReporteItem = {
      id: a.id,
      numeroEconomico: a.numeroEconomico,
      vehiculo: a.unidad ? `${a.unidad.marca} ${a.unidad.unidadModelo}` : null,
      proyecto: a.unidad?.proyecto?.nombre ?? a.proyectoReportante?.nombre ?? null,
      departamento: deptoNombre === "Compras" ? "Compras" : deptoNombre === "Finanzas" ? "Finanzas" : "Sin departamento",
      categoria: a.categoria,
      fecha: a.fecha,
      costo: Number(a.costo),
      descripcion: a.descripcion,
      proveedor: a.proveedor,
      servicio: a.servicio,
      estatus: a.estatus,
      sc: a.sc,
      odc: a.odc,
      fechaPago: a.fechaPago,
    };
    if (deptoNombre === "Compras") {
      apoyosCompras.push(item);
    } else if (deptoNombre === "Finanzas") {
      apoyosFinanzas.push(item);
    } else {
      apoyosOtros.push(item);
    }
  }

  const totalApoyosCompras = apoyosCompras.reduce((acc, a) => acc + a.costo, 0);
  const totalApoyosFinanzas = apoyosFinanzas.reduce((acc, a) => acc + a.costo, 0);

  function armarGastoPorCategoria(
    porCategoria: { categoria: CategoriaGasto; _sum: { costo: unknown } }[],
    combustible: { _sum: { costo: unknown } },
    tag: { _sum: { monto: unknown } }
  ): { categoria: CategoriaGasto; monto: number }[] {
    const mapa = new Map<CategoriaGasto, number>();
    for (const g of porCategoria) mapa.set(g.categoria, Number(g._sum.costo ?? 0));
    mapa.set("GASOLINA", (mapa.get("GASOLINA") ?? 0) + Number(combustible._sum.costo ?? 0));
    mapa.set("CASETAS", (mapa.get("CASETAS") ?? 0) + Number(tag._sum.monto ?? 0));
    return Array.from(mapa, ([categoria, monto]) => ({ categoria, monto }))
      .filter((g) => g.monto > 0)
      .sort((a, b) => b.monto - a.monto);
  }

  const gastoPorCategoria = armarGastoPorCategoria(gastosPorCategoria, combustibleAgg, tagAgg);
  const gastoTotal = gastoPorCategoria.reduce((acc, g) => acc + g.monto, 0);
  const gastoPorCategoriaMes = armarGastoPorCategoria(gastosPorCategoriaMes, combustibleAggMes, tagAggMes);
  const gastoTotalMes = gastoPorCategoriaMes.reduce((acc, g) => acc + g.monto, 0);
  const gastoPorCategoriaAnio = armarGastoPorCategoria(gastosPorCategoriaAnio, combustibleAnioAgg, tagAnioAgg);
  const gastoAcumuladoAnio = gastoPorCategoriaAnio.reduce((acc, g) => acc + g.monto, 0);

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
    gastoTotalMes,
    gastoPorCategoriaMes,
    presupuestoMes,
    presupuestoAnual,
    gastoAcumuladoAnio,
    gastoPorCategoriaAnio,
    totalChecklists,
    checklistsPromedioDiario,
    unidadesMovieron,
    unidadesConChecklistSemanal,
    unidadesConChecklistSemanalTotal,
    pctChecklistSemanal,
    siniestrosPeriodo: siniestrosPeriodoRaw.length,
    siniestrosAcumuladoAnio: siniestrosAnioCount,
    siniestrosDetalle,
    apoyosCompras,
    apoyosFinanzas,
    apoyosOtros,
    totalApoyosCompras,
    totalApoyosFinanzas,
    camposExtra,
  };
}

export type EstatusFlotaReporte = {
  desde: Date;
  hasta: Date;
  /** Alcance completo permitido (todos los proyectos del usuario, o toda la flota sin restricción) — siempre presente, sin importar qué se haya seleccionado. */
  general: EstatusFlota;
  /** Un bloque por cada proyecto seleccionado, mismo orden que se seleccionaron. */
  porProyecto: EstatusFlota[];
};

/**
 * Reporte completo de "Estatus semanal de flota": resumen general y desglose
 * individual por proyecto seleccionado — un único cálculo reutilizado tanto
 * por la descarga/envío inmediato como por el envío automático programado
 * (ver src/app/(app)/dashboards/actions.ts y src/lib/bi/motor-reportes.ts).
 * (Antes también incluía un resumen combinado de la selección — se quitó por
 * duplicar el resumen general cuando ambos se mostraban a la vez.)
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

  const [general, porProyecto] = await Promise.all([
    calcularEstatusFlota({ proyectoIds: proyectoIdsPermitidos, desde, hasta, proyectoLabel: "General", camposExtraSeleccionados }),
    Promise.all(
      seleccion.map((id) => calcularEstatusFlota({ proyectoIds: [id], desde, hasta, proyectoLabel: nombrePorId.get(id) ?? id, camposExtraSeleccionados }))
    ),
  ]);

  return { desde, hasta, general, porProyecto };
}
