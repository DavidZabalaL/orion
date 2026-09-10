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
  // Gastos reportados directo al proyecto (sin pasar por una unidad, ej.
  // el "comodín" de Peajes/Combustible/Mantenimiento) — se suman siempre,
  // aunque el proyecto no tenga unidades con historial en el periodo.
  const condProyectoReportante = { proyectoReportanteId: proyectoId, fecha: { gte: inicio, lt: fin } };
  const condiciones = [...periodos, condProyectoReportante];

  const [gastos, combustible, tags] = await Promise.all([
    prisma.gastoVehicular.findMany({ where: { OR: condiciones }, select: { fecha: true, costo: true } }),
    prisma.combustible.findMany({ where: { OR: condiciones }, select: { fecha: true, costo: true } }),
    prisma.tag.findMany({ where: { OR: condiciones }, select: { fecha: true, monto: true } }),
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

export type ResumenPresupuestoMes = { anio: number; mes: number; asignado: number; gastoMes: number };

/**
 * Asignado vs. gastado del mes en curso (a la fecha `referencia`, no todo el
 * mes) para un alcance de proyectos — usado por el reporte de "Estatus de
 * flota" para comparar gasto acumulado del mes contra el presupuesto
 * mensual asignado. `proyectoIds: null` = todos los proyectos (sin restricción).
 *
 * El "asignado" prioriza el Presupuesto por partida (el que realmente se usa
 * en la práctica — capturado por categoría/mes, ej. vía importación de
 * Excel) sobre PresupuestoMensual (un total simple manual que, en los datos
 * reales, casi nunca se llena): para cada proyecto se toma la suma por
 * partida si existe, y solo se recurre al total simple cuando ese proyecto
 * no tiene ninguna partida capturada ese mes — así nunca se cuenta doble.
 */
export async function obtenerPresupuestoDelMes(proyectoIds: string[] | null, referencia: Date): Promise<ResumenPresupuestoMes> {
  const anio = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth() + 1;
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const whereProyecto = proyectoIds !== null ? { proyectoId: { in: proyectoIds } } : {};
  const filtroProyectoGasto = proyectoIds !== null
    ? { OR: [{ unidad: { proyectoId: { in: proyectoIds } } }, { proyectoReportanteId: { in: proyectoIds } }] }
    : {};

  const [partidasPorProyecto, presupuestosMensuales, gastos, combustible, tags] = await Promise.all([
    prisma.presupuestoPartida.groupBy({ by: ["proyectoId"], where: { anio, mes, ...whereProyecto }, _sum: { montoPresupuestado: true } }),
    prisma.presupuestoMensual.findMany({ where: { anio, mes, ...whereProyecto }, select: { proyectoId: true, montoAsignado: true } }),
    prisma.gastoVehicular.aggregate({ where: { fecha: { gte: inicioMes, lte: referencia }, ...filtroProyectoGasto }, _sum: { costo: true } }),
    prisma.combustible.aggregate({ where: { fecha: { gte: inicioMes, lte: referencia }, ...filtroProyectoGasto }, _sum: { costo: true } }),
    prisma.tag.aggregate({ where: { fecha: { gte: inicioMes, lte: referencia }, ...filtroProyectoGasto }, _sum: { monto: true } }),
  ]);

  const proyectosConPartida = new Set(partidasPorProyecto.map((p) => p.proyectoId));
  const asignadoPartida = partidasPorProyecto.reduce((acc, p) => acc + Number(p._sum.montoPresupuestado ?? 0), 0);
  const asignadoSimpleFaltante = presupuestosMensuales
    .filter((m) => !proyectosConPartida.has(m.proyectoId))
    .reduce((acc, m) => acc + Number(m.montoAsignado), 0);
  const asignado = asignadoPartida + asignadoSimpleFaltante;

  const gastoMes = Number(gastos._sum.costo ?? 0) + Number(combustible._sum.costo ?? 0) + Number(tags._sum.monto ?? 0);

  return { anio, mes, asignado, gastoMes };
}

/**
 * Presupuesto aprobado anual por proyecto, mismo criterio de prioridad que
 * `obtenerPresupuestoDelMes`: la suma del Presupuesto por partida si el
 * proyecto tiene partidas capturadas ese año, si no el total simple
 * (`Proyecto.presupuestoAprobadoAnual`). Una sola consulta agrupada para
 * todos los proyectos — pensado para listados (ej. /proyectos).
 */
export async function obtenerPresupuestoAprobadoPorProyecto(anio: number): Promise<Map<string, number>> {
  const [partidasPorProyecto, proyectos] = await Promise.all([
    prisma.presupuestoPartida.groupBy({ by: ["proyectoId"], where: { anio }, _sum: { montoPresupuestado: true } }),
    prisma.proyecto.findMany({ select: { id: true, presupuestoAprobadoAnual: true } }),
  ]);

  const partidaPorProyecto = new Map(partidasPorProyecto.map((p) => [p.proyectoId, Number(p._sum.montoPresupuestado ?? 0)]));
  const resultado = new Map<string, number>();
  for (const proyecto of proyectos) {
    const desdePartida = partidaPorProyecto.get(proyecto.id) ?? 0;
    resultado.set(proyecto.id, desdePartida > 0 ? desdePartida : Number(proyecto.presupuestoAprobadoAnual));
  }
  return resultado;
}

export type GastoMesProyecto = { asignado: number; gastoMes: number };

/**
 * Gasto y presupuesto asignado de un mes específico, por proyecto — usado en
 * el listado de /proyectos para la columna y el widget de "gasto del mes".
 * Reutiliza `obtenerResumenPresupuestoPorPartida` (la misma fuente que ya se
 * muestra en la ficha del proyecto) en vez de recalcular el gasto real por su
 * cuenta: sumar el "real" con una atribución distinta (ej. proyecto ACTUAL de
 * la unidad en vez del histórico) haría que esta columna no cuadrara con el
 * desglose por partida de la ficha del proyecto para unidades reasignadas
 * entre proyectos — la misma clase de inconsistencia que se quiere corregir.
 */
export async function obtenerGastoMesPorProyecto(proyectoIds: string[], anio: number, mes: number): Promise<Map<string, GastoMesProyecto>> {
  const resultado = new Map<string, GastoMesProyecto>();
  if (proyectoIds.length === 0) return resultado;

  const [resumenes, presupuestosMensuales] = await Promise.all([
    Promise.all(proyectoIds.map((id) => obtenerResumenPresupuestoPorPartida(id, anio))),
    prisma.presupuestoMensual.findMany({ where: { anio, mes, proyectoId: { in: proyectoIds } }, select: { proyectoId: true, montoAsignado: true } }),
  ]);
  const simplePorProyecto = new Map(presupuestosMensuales.map((m) => [m.proyectoId, Number(m.montoAsignado)]));

  proyectoIds.forEach((proyectoId, i) => {
    const resumen = resumenes[i];
    let asignadoPartida = 0;
    let gastoMes = 0;
    for (const p of resumen.partidas) {
      const datosMes = p.meses[mes - 1];
      asignadoPartida += datosMes.presupuestado;
      gastoMes += datosMes.real;
    }
    const asignado = asignadoPartida > 0 ? asignadoPartida : (simplePorProyecto.get(proyectoId) ?? 0);
    resultado.set(proyectoId, { asignado, gastoMes });
  });
  return resultado;
}

export type MesPartida = { mes: number; presupuestado: number; real: number; diferencia: number };
export type GastoPorUnidad = { numeroEconomico: string; monto: number };
export type PartidaResumen = {
  categoria: string;
  meses: MesPartida[];
  presupuestadoAnual: number;
  realAnual: number;
  diferenciaAnual: number;
  /** Desglose del gasto REAL anual por unidad — vacío para VIATICOS_OPERACION (se reporta a nivel proyecto, sin unidad). */
  porUnidad: GastoPorUnidad[];
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
 * Los gastos de unidades se atribuyen al proyecto por el período histórico en que
 * la unidad estuvo asignada (UnidadHistoricoProyecto) — o, si ninguno cubre esa
 * fecha (UnidadHistoricoProyecto está lejos de completo: en la práctica cubre
 * ~4% de los gastos de Mantenimiento), por el proyectoReportanteId que ya
 * queda grabado en el gasto al capturarlo. Antes solo se usaba el histórico
 * para estas categorías (a diferencia de Gasolina/Casetas, que ya hacían este
 * mismo OR) y por eso el "gasto real" de Mantenimiento aquí no cuadraba ni de
 * cerca con obtenerResumenPresupuestoAnual (usado en /proyectos), que sí cuenta
 * proyectoReportanteId para cualquier categoría.
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
    // VIATICOS_OPERACION se excluye aquí: se cuenta aparte (siguiente
    // consulta), exclusivamente por proyectoReportanteId — nunca por
    // histórico, aunque exista uno, para no contarlo dos veces.
    prisma.gastoVehicular.findMany({
      where: { OR: orConProyectoReportante, categoria: { not: "VIATICOS_OPERACION" } },
      select: { categoria: true, fecha: true, costo: true, numeroEconomico: true },
    }),
    prisma.gastoVehicular.findMany({
      where: { categoria: "VIATICOS_OPERACION", proyectoReportanteId: proyectoId, fecha: { gte: inicio, lt: fin } },
      select: { fecha: true, costo: true },
    }),
    prisma.combustible.findMany({
      where: { OR: orConProyectoReportante },
      select: { fecha: true, costo: true, numeroEconomico: true },
    }),
    prisma.tag.findMany({
      where: { OR: orConProyectoReportante },
      select: { fecha: true, monto: true, numeroEconomico: true },
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
  const gastoPorCategoriaYUnidad = new Map<string, Map<string, number>>();
  for (const g of gastosPorUnidad) {
    const mes = g.fecha.getUTCMonth() + 1;
    if (!gastoPorCategoriaYMes.has(g.categoria)) gastoPorCategoriaYMes.set(g.categoria, new Map());
    const mapaCategoria = gastoPorCategoriaYMes.get(g.categoria)!;
    mapaCategoria.set(mes, (mapaCategoria.get(mes) ?? 0) + Number(g.costo));

    if (g.numeroEconomico) {
      if (!gastoPorCategoriaYUnidad.has(g.categoria)) gastoPorCategoriaYUnidad.set(g.categoria, new Map());
      const mapaUnidad = gastoPorCategoriaYUnidad.get(g.categoria)!;
      mapaUnidad.set(g.numeroEconomico, (mapaUnidad.get(g.numeroEconomico) ?? 0) + Number(g.costo));
    }
  }

  const sumarPorUnidad = (filas: { numeroEconomico: string | null; costo?: unknown; monto?: unknown }[]) => {
    const mapa = new Map<string, number>();
    for (const f of filas) {
      if (!f.numeroEconomico) continue;
      const valor = Number(f.costo ?? f.monto ?? 0);
      mapa.set(f.numeroEconomico, (mapa.get(f.numeroEconomico) ?? 0) + valor);
    }
    return mapa;
  };

  const viaticosPorMes = sumarPorMes(viaticos);
  const combustiblePorMes = sumarPorMes(combustible);
  const tagPorMes = sumarPorMes(tags);
  const combustiblePorUnidad = sumarPorUnidad(combustible);
  const tagPorUnidad = sumarPorUnidad(tags);

  const porUnidadDeCategoria = (categoria: string): GastoPorUnidad[] => {
    const mapa =
      categoria === "GASOLINA" ? combustiblePorUnidad : categoria === "CASETAS" ? tagPorUnidad : categoria === "VIATICOS_OPERACION" ? null : gastoPorCategoriaYUnidad.get(categoria) ?? null;
    if (!mapa) return [];
    return Array.from(mapa.entries())
      .map(([numeroEconomico, monto]) => ({ numeroEconomico, monto }))
      .sort((a, b) => b.monto - a.monto);
  };

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
      porUnidad: porUnidadDeCategoria(categoria),
    };
  });

  return { anio, proyectoId, partidas };
}
