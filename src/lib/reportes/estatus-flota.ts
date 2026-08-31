import { prisma } from "@/lib/prisma";
import { calcularSlaPorUnidadesEnRango } from "@/lib/sla-disponibilidad";
import type { EstatusUnidad, MotivoIndisponibilidad, CategoriaGasto } from "@/generated/prisma/enums";

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
  gastoTotal: number;
  gastoPorCategoria: { categoria: CategoriaGasto; monto: number }[];
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
}: {
  proyectoIds: string[] | null;
  desde: Date;
  hasta: Date;
  proyectoLabel: string;
}): Promise<EstatusFlota> {
  const filtroProyecto = proyectoIds !== null ? { proyectoId: { in: proyectoIds } } : {};

  const unidades = await prisma.unidad.findMany({
    where: filtroProyecto,
    select: { numeroEconomico: true, estatus: true },
  });
  const economicos = unidades.map((u) => u.numeroEconomico);

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
        select: { numeroEconomico: true, disponible: true, motivo: true },
      })
    : [];
  const periodoPorEconomico = new Map<string, { disponible: boolean; motivo: MotivoIndisponibilidad | null }>();
  for (const p of periodos) {
    if (!periodoPorEconomico.has(p.numeroEconomico)) periodoPorEconomico.set(p.numeroEconomico, { disponible: p.disponible, motivo: p.motivo });
  }

  let unidadesDisponibles = 0;
  const porMotivoMapa = new Map<MotivoIndisponibilidad | "SIN_MOTIVO", number>();
  for (const numeroEconomico of economicosNoBaja) {
    const periodo = periodoPorEconomico.get(numeroEconomico);
    const disponible = periodo?.disponible ?? true;
    if (disponible) {
      unidadesDisponibles++;
    } else {
      const motivo = periodo?.motivo ?? "SIN_MOTIVO";
      porMotivoMapa.set(motivo, (porMotivoMapa.get(motivo) ?? 0) + 1);
    }
  }
  const unidadesNoDisponibles = economicosNoBaja.length - unidadesDisponibles;
  const porMotivo = Array.from(porMotivoMapa, ([motivo, cantidad]) => ({ motivo, cantidad }));

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
  const [gastosPorCategoria, combustibleAgg, tagAgg] = await Promise.all([
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
  ]);

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
    gastoTotal,
    gastoPorCategoria,
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
}: {
  /** null = sin restricción de proyecto (Administrador/rol global, o el cron sin sesión). */
  proyectoIdsPermitidos: string[] | null;
  proyectoIdsSeleccionados: string[] | null;
  desde: Date;
  hasta: Date;
}): Promise<EstatusFlotaReporte> {
  const seleccion = proyectoIdsSeleccionados ?? [];

  const proyectos = seleccion.length > 0
    ? await prisma.proyecto.findMany({ where: { id: { in: seleccion } }, select: { id: true, nombre: true } })
    : [];
  const nombrePorId = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const [general, seleccionCombinada, porProyecto] = await Promise.all([
    calcularEstatusFlota({ proyectoIds: proyectoIdsPermitidos, desde, hasta, proyectoLabel: "General" }),
    // Con exactamente 1 proyecto seleccionado, el combinado sería idéntico al
    // desglose de ese único proyecto (solo con otro título) — se omite.
    seleccion.length > 1
      ? calcularEstatusFlota({ proyectoIds: seleccion, desde, hasta, proyectoLabel: `Selección (${seleccion.length} proyectos)` })
      : Promise.resolve(null),
    Promise.all(
      seleccion.map((id) => calcularEstatusFlota({ proyectoIds: [id], desde, hasta, proyectoLabel: nombrePorId.get(id) ?? id }))
    ),
  ]);

  return { desde, hasta, general, seleccion: seleccionCombinada, porProyecto };
}
