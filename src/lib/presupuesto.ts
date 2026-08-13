import { prisma } from "@/lib/prisma";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

export type MesPresupuesto = { mes: number; asignado: number; gasto: number };

export type ResumenPresupuestoAnual = {
  anio: number;
  presupuestoAprobadoAnual: number;
  asignadoAnual: number;
  gastoAnual: number;
  meses: MesPresupuesto[];
};

/** Builds per-historico OR conditions intersected with a year range. */
function condicionesPorPeriodo(
  historicos: { numeroEconomico: string; fechaInicio: Date; fechaFin: Date | null }[],
  inicio: Date,
  fin: Date,
) {
  return historicos.map((h) => ({
    numeroEconomico: h.numeroEconomico,
    fecha: {
      gte: h.fechaInicio > inicio ? h.fechaInicio : inicio,
      lt: h.fechaFin && h.fechaFin < fin ? h.fechaFin : fin,
    },
  }));
}

export async function obtenerResumenPresupuestoAnual(proyectoId: string, anio: number): Promise<ResumenPresupuestoAnual> {
  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin = new Date(Date.UTC(anio + 1, 0, 1));

  const [proyecto, historicos, presupuestosMensuales] = await Promise.all([
    prisma.proyecto.findUniqueOrThrow({ where: { id: proyectoId }, select: { presupuestoAprobadoAnual: true } }),
    prisma.unidadHistoricoProyecto.findMany({
      where: {
        proyectoId,
        fechaInicio: { lt: fin },
        OR: [{ fechaFin: null }, { fechaFin: { gte: inicio } }],
      },
      select: { numeroEconomico: true, fechaInicio: true, fechaFin: true },
    }),
    prisma.presupuestoMensual.findMany({ where: { proyectoId, anio } }),
  ]);

  const periodos = condicionesPorPeriodo(historicos, inicio, fin);

  const [gastos, combustible, tags] = periodos.length === 0
    ? [[], [], []]
    : await Promise.all([
        prisma.gastoVehicular.findMany({ where: { OR: periodos }, select: { fecha: true, costo: true } }),
        prisma.combustible.findMany({ where: { OR: periodos }, select: { fecha: true, costo: true } }),
        prisma.tag.findMany({ where: { OR: periodos }, select: { fecha: true, monto: true } }),
      ]);

  const gastoPorMes = new Map<number, number>();
  for (const g of [...gastos, ...combustible]) {
    const mes = g.fecha.getUTCMonth() + 1;
    gastoPorMes.set(mes, (gastoPorMes.get(mes) ?? 0) + Number(g.costo));
  }
  for (const t of tags) {
    const mes = t.fecha.getUTCMonth() + 1;
    gastoPorMes.set(mes, (gastoPorMes.get(mes) ?? 0) + Number(t.monto));
  }

  const asignadoPorMes = new Map(presupuestosMensuales.map((p) => [p.mes, Number(p.montoAsignado)]));

  const meses: MesPresupuesto[] = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return { mes, asignado: asignadoPorMes.get(mes) ?? 0, gasto: gastoPorMes.get(mes) ?? 0 };
  });

  return {
    anio,
    presupuestoAprobadoAnual: Number(proyecto.presupuestoAprobadoAnual),
    asignadoAnual: meses.reduce((acc, m) => acc + m.asignado, 0),
    gastoAnual: meses.reduce((acc, m) => acc + m.gasto, 0),
    meses,
  };
}

export type MesPartida = { mes: number; presupuestado: number; real: number; diferencia: number };
export type PartidaResumen = {
  categoria: string;
  meses: MesPartida[];
  presupuestadoAnual: number;
  realAnual: number;
  diferenciaAnual: number;
};
export type ResumenPresupuestoPorPartida = {
  anio: number;
  proyectoId: string;
  partidas: PartidaResumen[];
};

/**
 * Desglose de presupuesto por partida (categoría de gasto) y mes, comparando
 * PresupuestoPartida (techo autorizado) contra el REAL ya capturado en la
 * plataforma. El origen de REAL no es uniforme entre categorías:
 * - GASOLINA sale de Combustible (unidades del proyecto + gasto reportado a nivel proyecto).
 * - CASETAS sale únicamente de Tag (el módulo de Mantenimiento ya no permite capturar Casetas).
 * - VIATICOS_OPERACION sale de GastoVehicular sin pasar por unidad (proyectoReportanteId).
 * - Las demás categorías salen de GastoVehicular de las unidades del proyecto.
 * Los gastos de unidades se atribuyen al proyecto según el período histórico en que
 * la unidad estuvo asignada (UnidadHistoricoProyecto), no el proyecto actual.
 */
export async function obtenerResumenPresupuestoPorPartida(proyectoId: string, anio: number): Promise<ResumenPresupuestoPorPartida> {
  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin = new Date(Date.UTC(anio + 1, 0, 1));

  const [historicos, presupuestosPartida] = await Promise.all([
    prisma.unidadHistoricoProyecto.findMany({
      where: {
        proyectoId,
        fechaInicio: { lt: fin },
        OR: [{ fechaFin: null }, { fechaFin: { gte: inicio } }],
      },
      select: { numeroEconomico: true, fechaInicio: true, fechaFin: true },
    }),
    prisma.presupuestoPartida.findMany({ where: { proyectoId, anio } }),
  ]);

  const periodos = condicionesPorPeriodo(historicos, inicio, fin);

  // Expenses reported directly to the project (not via a unit) — always scoped by year only
  const orConProyectoReportante = [
    ...periodos,
    { proyectoReportanteId: proyectoId, fecha: { gte: inicio, lt: fin } } as const,
  ];

  const [gastosPorUnidad, viaticos, combustible, tags] = await Promise.all([
    periodos.length === 0
      ? ([] as { categoria: string; fecha: Date; costo: unknown }[])
      : prisma.gastoVehicular.findMany({
          where: { OR: periodos },
          select: { categoria: true, fecha: true, costo: true },
        }),
    prisma.gastoVehicular.findMany({
      where: { categoria: "VIATICOS_OPERACION", proyectoReportanteId: proyectoId, fecha: { gte: inicio, lt: fin } },
      select: { fecha: true, costo: true },
    }),
    prisma.combustible.findMany({
      where: { OR: orConProyectoReportante },
      select: { fecha: true, costo: true },
    }),
    prisma.tag.findMany({
      where: { OR: orConProyectoReportante },
      select: { fecha: true, monto: true },
    }),
  ]);

  const sumarPorMes = (filas: { fecha: Date; costo?: unknown; monto?: unknown }[]) => {
    const mapa = new Map<number, number>();
    for (const f of filas) {
      const mes = f.fecha.getUTCMonth() + 1;
      const valor = Number(f.costo ?? f.monto ?? 0);
      mapa.set(mes, (mapa.get(mes) ?? 0) + valor);
    }
    return mapa;
  };

  const gastoPorCategoriaYMes = new Map<string, Map<number, number>>();
  for (const g of gastosPorUnidad) {
    const mes = g.fecha.getUTCMonth() + 1;
    if (!gastoPorCategoriaYMes.has(g.categoria)) gastoPorCategoriaYMes.set(g.categoria, new Map());
    const mapaCategoria = gastoPorCategoriaYMes.get(g.categoria)!;
    mapaCategoria.set(mes, (mapaCategoria.get(mes) ?? 0) + Number(g.costo));
  }

  const viaticosPorMes = sumarPorMes(viaticos);
  const combustiblePorMes = sumarPorMes(combustible);
  const tagPorMes = sumarPorMes(tags);

  const presupuestadoPorCategoriaYMes = new Map<string, Map<number, number>>();
  for (const p of presupuestosPartida) {
    if (!presupuestadoPorCategoriaYMes.has(p.categoria)) presupuestadoPorCategoriaYMes.set(p.categoria, new Map());
    presupuestadoPorCategoriaYMes.get(p.categoria)!.set(p.mes, Number(p.montoPresupuestado));
  }

  const realPorMes = (categoria: string, mes: number): number => {
    if (categoria === "GASOLINA") return combustiblePorMes.get(mes) ?? 0;
    if (categoria === "CASETAS") return tagPorMes.get(mes) ?? 0;
    if (categoria === "VIATICOS_OPERACION") return viaticosPorMes.get(mes) ?? 0;
    return gastoPorCategoriaYMes.get(categoria)?.get(mes) ?? 0;
  };

  const partidas: PartidaResumen[] = Object.keys(CATEGORIA_GASTO_LABEL).map((categoria) => {
    const presupuestadoMes = presupuestadoPorCategoriaYMes.get(categoria);
    const meses: MesPartida[] = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const presupuestado = presupuestadoMes?.get(mes) ?? 0;
      const real = realPorMes(categoria, mes);
      return { mes, presupuestado, real, diferencia: presupuestado - real };
    });

    return {
      categoria,
      meses,
      presupuestadoAnual: meses.reduce((acc, m) => acc + m.presupuestado, 0),
      realAnual: meses.reduce((acc, m) => acc + m.real, 0),
      diferenciaAnual: meses.reduce((acc, m) => acc + m.diferencia, 0),
    };
  });

  return { anio, proyectoId, partidas };
}
