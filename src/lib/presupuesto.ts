import { prisma } from "@/lib/prisma";

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
