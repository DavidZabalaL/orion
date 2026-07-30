import { prisma } from "@/lib/prisma";

export type AlertaPreventiva = {
  numeroEconomico: string;
  tipoVehiculo: string;
  kmDesdeUltimoMantenimiento: number;
  intervaloKm: number;
  horasDesdeUltimoMantenimiento: number | null;
  intervaloHoras: number | null;
  vencidaPorKm: boolean;
  vencidaPorHoras: boolean;
};

async function calcularAlerta(
  unidad: { numeroEconomico: string; tipoVehiculo: string; kmOficial: number },
  config: { intervaloKm: number; intervaloHoras: number | null }
): Promise<AlertaPreventiva | null> {
  const ultimoMantenimiento = await prisma.gastoVehicular.findFirst({
    where: { numeroEconomico: unidad.numeroEconomico, categoria: "MANTENIMIENTO_PREVENTIVO", estatus: { in: ["REALIZADO", "PAGADO"] } },
    orderBy: { fecha: "desc" },
    select: { fecha: true, kmAlMomento: true },
  });

  const kmAlUltimoMantenimiento = ultimoMantenimiento?.kmAlMomento ?? 0;
  const kmDesdeUltimoMantenimiento = unidad.kmOficial - kmAlUltimoMantenimiento;
  const vencidaPorKm = kmDesdeUltimoMantenimiento >= config.intervaloKm;

  let horasDesdeUltimoMantenimiento: number | null = null;
  let vencidaPorHoras = false;

  if (config.intervaloHoras) {
    const ultimoChecklist = await prisma.checklist.findFirst({
      where: { numeroEconomico: unidad.numeroEconomico, horometro: { not: null } },
      orderBy: { fecha: "desc" },
      select: { horometro: true },
    });
    const checklistAlMantenimiento = ultimoMantenimiento
      ? await prisma.checklist.findFirst({
          where: { numeroEconomico: unidad.numeroEconomico, horometro: { not: null }, fecha: { lte: ultimoMantenimiento.fecha } },
          orderBy: { fecha: "desc" },
          select: { horometro: true },
        })
      : null;

    if (ultimoChecklist?.horometro != null) {
      const horometroBase = checklistAlMantenimiento?.horometro ?? 0;
      horasDesdeUltimoMantenimiento = ultimoChecklist.horometro - horometroBase;
      vencidaPorHoras = horasDesdeUltimoMantenimiento >= config.intervaloHoras;
    }
  }

  if (!vencidaPorKm && !vencidaPorHoras) return null;

  return {
    numeroEconomico: unidad.numeroEconomico,
    tipoVehiculo: unidad.tipoVehiculo,
    kmDesdeUltimoMantenimiento,
    intervaloKm: config.intervaloKm,
    horasDesdeUltimoMantenimiento,
    intervaloHoras: config.intervaloHoras,
    vencidaPorKm,
    vencidaPorHoras,
  };
}

export async function obtenerAlertasMantenimientoPreventivo(proyectoIds: string[] | null): Promise<AlertaPreventiva[]> {
  const [unidades, configuraciones] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: "ACTIVO", ...(proyectoIds !== null ? { proyectoId: { in: proyectoIds } } : {}) },
      select: { numeroEconomico: true, tipoVehiculo: true, kmOficial: true },
    }),
    prisma.configuracionMantenimientoPreventivo.findMany(),
  ]);

  const configPorTipo = new Map(configuraciones.map((c) => [c.tipoVehiculo, c]));

  const alertas: AlertaPreventiva[] = [];
  for (const unidad of unidades) {
    const config = configPorTipo.get(unidad.tipoVehiculo);
    if (!config) continue;
    const alerta = await calcularAlerta(unidad, config);
    if (alerta) alertas.push(alerta);
  }

  return alertas;
}

export async function obtenerAlertaPreventivaUnidad(numeroEconomico: string): Promise<AlertaPreventiva | null> {
  const unidad = await prisma.unidad.findUnique({
    where: { numeroEconomico },
    select: { numeroEconomico: true, tipoVehiculo: true, kmOficial: true },
  });
  if (!unidad) return null;

  const config = await prisma.configuracionMantenimientoPreventivo.findUnique({ where: { tipoVehiculo: unidad.tipoVehiculo } });
  if (!config) return null;

  return calcularAlerta(unidad, config);
}
