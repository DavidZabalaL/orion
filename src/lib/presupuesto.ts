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

export async function obtenerResumenPresupuestoAnual(proyectoId: string, anio: number): Promise<ResumenPresupuestoAnual> {
  const [proyecto, unidades, presupuestosMensuales] = await Promise.all([
    prisma.proyecto.findUniqueOrThrow({ where: { id: proyectoId }, select: { presupuestoAprobadoAnual: true } }),
    prisma.unidad.findMany({ where: { proyectoId }, select: { numeroEconomico: true } }),
    prisma.presupuestoMensual.findMany({ where: { proyectoId, anio } }),
  ]);

  const numerosEconomicos = unidades.map((u) => u.numeroEconomico);
  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin = new Date(Date.UTC(anio + 1, 0, 1));

  const [gastos, combustible, tags] = numerosEconomicos.length === 0
    ? [[], [], []]
    : await Promise.all([
        prisma.gastoVehicular.findMany({ where: { numeroEconomico: { in: numerosEconomicos }, fecha: { gte: inicio, lt: fin } }, select: { fecha: true, costo: true } }),
        prisma.combustible.findMany({ where: { numeroEconomico: { in: numerosEconomicos }, fecha: { gte: inicio, lt: fin } }, select: { fecha: true, costo: true } }),
        prisma.tag.findMany({ where: { numeroEconomico: { in: numerosEconomicos }, fecha: { gte: inicio, lt: fin } }, select: { fecha: true, monto: true } }),
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
 * Nota: como en obtenerResumenPresupuestoAnual, las unidades se resuelven por su
 * proyecto ACTUAL, no el histórico — si una unidad cambió de proyecto a mitad de
 * año, su gasto pasado queda atribuido al proyecto actual.
 */
export async function obtenerResumenPresupuestoPorPartida(proyectoId: string, anio: number): Promise<ResumenPresupuestoPorPartida> {
  const inicio = new Date(Date.UTC(anio, 0, 1));
  const fin = new Date(Date.UTC(anio + 1, 0, 1));

  const [unidades, presupuestosPartida] = await Promise.all([
    prisma.unidad.findMany({ where: { proyectoId }, select: { numeroEconomico: true } }),
    prisma.presupuestoPartida.findMany({ where: { proyectoId, anio } }),
  ]);
  const numerosEconomicos = unidades.map((u) => u.numeroEconomico);

  const [gastosPorUnidad, viaticos, combustible, tags] = await Promise.all([
    numerosEconomicos.length === 0
      ? []
      : prisma.gastoVehicular.findMany({
          where: { numeroEconomico: { in: numerosEconomicos }, fecha: { gte: inicio, lt: fin } },
          select: { categoria: true, fecha: true, costo: true },
        }),
    prisma.gastoVehicular.findMany({
      where: { categoria: "VIATICOS_OPERACION", proyectoReportanteId: proyectoId, fecha: { gte: inicio, lt: fin } },
      select: { fecha: true, costo: true },
    }),
    numerosEconomicos.length === 0
      ? []
      : prisma.combustible.findMany({
          where: {
            fecha: { gte: inicio, lt: fin },
            OR: [{ numeroEconomico: { in: numerosEconomicos } }, { proyectoReportanteId: proyectoId }],
          },
          select: { fecha: true, costo: true },
        }),
    numerosEconomicos.length === 0
      ? []
      : prisma.tag.findMany({
          where: {
            fecha: { gte: inicio, lt: fin },
            OR: [{ numeroEconomico: { in: numerosEconomicos } }, { proyectoReportanteId: proyectoId }],
          },
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
