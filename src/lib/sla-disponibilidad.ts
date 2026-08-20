import { prisma } from "@/lib/prisma";

const MS_POR_DIA = 86_400_000;

/**
 * Registra un cambio real de `disponibilidad` en el historial: cierra el
 * periodo abierto (si hay uno y su valor es distinto) y abre uno nuevo. Debe
 * llamarse en cada punto donde se escribe `Unidad.disponibilidad` (toggle
 * manual, baja, alta, importación) para que el SLA de disponibilidad
 * (ver `calcularSlaPorUnidades`) tenga cobertura completa.
 */
export async function registrarCambioDisponibilidad(numeroEconomico: string, disponible: boolean, fecha: Date = new Date()) {
  const abierto = await prisma.historicoDisponibilidadUnidad.findFirst({
    where: { numeroEconomico, hasta: null },
    orderBy: { desde: "desc" },
  });

  if (abierto) {
    if (abierto.disponible === disponible) return; // sin cambio real
    await prisma.historicoDisponibilidadUnidad.update({ where: { id: abierto.id }, data: { hasta: fecha } });
  }

  await prisma.historicoDisponibilidadUnidad.create({ data: { numeroEconomico, disponible, desde: fecha } });
}

export type SlaUnidad = { diasActivo: number; diasInactivo: number; porcentaje: number | null };

type Periodo = { disponible: boolean; desde: Date; hasta: Date | null };

function calcularSlaDesdePeriodos(periodos: Periodo[], ahora: Date): SlaUnidad {
  let diasActivo = 0;
  let diasInactivo = 0;
  for (const p of periodos) {
    const fin = p.hasta ?? ahora;
    const dias = Math.max(0, (fin.getTime() - p.desde.getTime()) / MS_POR_DIA);
    if (p.disponible) diasActivo += dias;
    else diasInactivo += dias;
  }
  const total = diasActivo + diasInactivo;
  return {
    diasActivo: Math.round(diasActivo * 10) / 10,
    diasInactivo: Math.round(diasInactivo * 10) / 10,
    porcentaje: total > 0 ? Math.round((diasActivo / total) * 1000) / 10 : null,
  };
}

/** SLA de disponibilidad por unidad, desde que existe historial (no antes) hasta ahora. */
export async function calcularSlaPorUnidades(numerosEconomicos: string[], ahora: Date = new Date()): Promise<Map<string, SlaUnidad>> {
  const resultado = new Map<string, SlaUnidad>();
  if (numerosEconomicos.length === 0) return resultado;

  const periodos = await prisma.historicoDisponibilidadUnidad.findMany({
    where: { numeroEconomico: { in: numerosEconomicos } },
    orderBy: { desde: "asc" },
    select: { numeroEconomico: true, disponible: true, desde: true, hasta: true },
  });

  const porUnidad = new Map<string, Periodo[]>();
  for (const p of periodos) {
    const lista = porUnidad.get(p.numeroEconomico) ?? [];
    lista.push(p);
    porUnidad.set(p.numeroEconomico, lista);
  }

  for (const numeroEconomico of numerosEconomicos) {
    resultado.set(numeroEconomico, calcularSlaDesdePeriodos(porUnidad.get(numeroEconomico) ?? [], ahora));
  }
  return resultado;
}
