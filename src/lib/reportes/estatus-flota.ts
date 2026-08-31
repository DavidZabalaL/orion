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

  // Gastos del periodo — mismo patrón OR (unidad.proyectoId / proyectoReportanteId)
  // que ya usa /tag para alcance por proyecto en un modelo con ambos campos.
  const filtroProyectoGasto = proyectoIds !== null
    ? { OR: [{ unidad: { proyectoId: { in: proyectoIds } } }, { proyectoReportanteId: { in: proyectoIds } }] }
    : {};
  const gastosPorCategoria = await prisma.gastoVehicular.groupBy({
    by: ["categoria"],
    where: { fecha: { gte: desde, lte: hasta }, ...filtroProyectoGasto },
    _sum: { costo: true },
  });
  const gastoPorCategoria = gastosPorCategoria
    .map((g) => ({ categoria: g.categoria, monto: Number(g._sum.costo ?? 0) }))
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
