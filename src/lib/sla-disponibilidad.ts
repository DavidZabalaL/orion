import { prisma } from "@/lib/prisma";

const MS_POR_DIA = 86_400_000;

/**
 * Registra un cambio real de `disponibilidad` en el historial: cierra el
 * periodo abierto (si hay uno y su valor es distinto) y abre uno nuevo. Debe
 * llamarse en cada punto donde se escribe `Unidad.disponibilidad` (toggle
 * manual, baja, alta, importación) para que el SLA de disponibilidad tenga
 * cobertura completa.
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
export type SlaMensual = SlaUnidad & { anio: number; mes: number };
export type SlaMensualProyecto = { proyecto: string; anio: number; mes: number; porcentajePromedio: number; unidadesConDatos: number };

type Periodo = { disponible: boolean; desde: Date; hasta: Date | null };
type Rango = { desde: Date; hasta: Date };

export const NOMBRE_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function inicioMes(anio: number, mes: number): Date {
  return new Date(anio, mes - 1, 1);
}

function inicioMesSiguiente(anio: number, mes: number): Date {
  return mes === 12 ? new Date(anio + 1, 0, 1) : new Date(anio, mes, 1);
}

/** true si (anioA, mesA) es igual o anterior a (anioB, mesB). */
function mesMenorOIgual(anioA: number, mesA: number, anioB: number, mesB: number): boolean {
  return anioA < anioB || (anioA === anioB && mesA <= mesB);
}

function calcularSlaEnRango(periodos: Periodo[], rango: Rango): SlaUnidad {
  let diasActivo = 0;
  let diasInactivo = 0;
  for (const p of periodos) {
    const inicio = p.desde > rango.desde ? p.desde : rango.desde;
    const finPeriodo = p.hasta ?? rango.hasta;
    const fin = finPeriodo < rango.hasta ? finPeriodo : rango.hasta;
    const dias = (fin.getTime() - inicio.getTime()) / MS_POR_DIA;
    if (dias <= 0) continue;
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

async function obtenerPeriodosPorUnidad(numerosEconomicos: string[]): Promise<Map<string, Periodo[]>> {
  const porUnidad = new Map<string, Periodo[]>();
  if (numerosEconomicos.length === 0) return porUnidad;

  const periodos = await prisma.historicoDisponibilidadUnidad.findMany({
    where: { numeroEconomico: { in: numerosEconomicos } },
    orderBy: { desde: "asc" },
    select: { numeroEconomico: true, disponible: true, desde: true, hasta: true },
  });
  for (const p of periodos) {
    const lista = porUnidad.get(p.numeroEconomico) ?? [];
    lista.push(p);
    porUnidad.set(p.numeroEconomico, lista);
  }
  return porUnidad;
}

/**
 * SLA del MES EN CURSO, hasta el momento — se va actualizando día a día
 * (no es el acumulado histórico). Es lo que se muestra en la columna de
 * Inventario de Unidades y en el widget de SLA por proyecto.
 */
export async function calcularSlaMesActualPorUnidades(numerosEconomicos: string[], ahora: Date = new Date()): Promise<Map<string, SlaUnidad>> {
  const resultado = new Map<string, SlaUnidad>();
  if (numerosEconomicos.length === 0) return resultado;

  const rango = { desde: inicioMes(ahora.getFullYear(), ahora.getMonth() + 1), hasta: ahora };
  const porUnidad = await obtenerPeriodosPorUnidad(numerosEconomicos);
  for (const numeroEconomico of numerosEconomicos) {
    resultado.set(numeroEconomico, calcularSlaEnRango(porUnidad.get(numeroEconomico) ?? [], rango));
  }
  return resultado;
}

/**
 * Histórico mensual de una unidad: un renglón por cada mes desde que existe
 * historial para ella hasta el mes en curso (el más reciente primero). El
 * mes en curso se corta "hasta ahora" (parcial); los meses anteriores están
 * completos.
 */
export async function calcularSlaMensualPorUnidad(numeroEconomico: string, ahora: Date = new Date()): Promise<SlaMensual[]> {
  const periodos = (await obtenerPeriodosPorUnidad([numeroEconomico])).get(numeroEconomico) ?? [];
  if (periodos.length === 0) return [];

  const primerMes = { anio: periodos[0].desde.getFullYear(), mes: periodos[0].desde.getMonth() + 1 };
  const mesActual = { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 };

  const meses: SlaMensual[] = [];
  let cursor = { ...primerMes };
  while (mesMenorOIgual(cursor.anio, cursor.mes, mesActual.anio, mesActual.mes)) {
    const esMesActual = cursor.anio === mesActual.anio && cursor.mes === mesActual.mes;
    const rango = { desde: inicioMes(cursor.anio, cursor.mes), hasta: esMesActual ? ahora : inicioMesSiguiente(cursor.anio, cursor.mes) };
    meses.push({ anio: cursor.anio, mes: cursor.mes, ...calcularSlaEnRango(periodos, rango) });
    cursor = cursor.mes === 12 ? { anio: cursor.anio + 1, mes: 1 } : { anio: cursor.anio, mes: cursor.mes + 1 };
  }
  return meses.reverse();
}

/**
 * Histórico mensual por proyecto: promedio simple del % de las unidades del
 * proyecto que ya tengan datos ese mes. `filtroProyectoIds` null = todos los
 * proyectos permitidos (Administrador); si no, solo esos proyectoId.
 */
export async function calcularSlaMensualPorProyecto(filtroProyectoIds: string[] | null, ahora: Date = new Date()): Promise<SlaMensualProyecto[]> {
  const unidades = await prisma.unidad.findMany({
    where: filtroProyectoIds !== null ? { proyectoId: { in: filtroProyectoIds } } : {},
    select: { numeroEconomico: true, proyecto: { select: { nombre: true } } },
  });
  if (unidades.length === 0) return [];

  const periodosPorUnidad = await obtenerPeriodosPorUnidad(unidades.map((u) => u.numeroEconomico));
  const todosLosPeriodos = Array.from(periodosPorUnidad.values()).flat();
  if (todosLosPeriodos.length === 0) return [];

  const proyectoPorNumero = new Map(unidades.map((u) => [u.numeroEconomico, u.proyecto?.nombre ?? "Sin proyecto"]));
  const primerDesde = todosLosPeriodos.reduce((min, p) => (p.desde < min ? p.desde : min), todosLosPeriodos[0].desde);
  const primerMes = { anio: primerDesde.getFullYear(), mes: primerDesde.getMonth() + 1 };
  const mesActual = { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 };

  const resultado: SlaMensualProyecto[] = [];
  let cursor = { ...primerMes };
  while (mesMenorOIgual(cursor.anio, cursor.mes, mesActual.anio, mesActual.mes)) {
    const esMesActual = cursor.anio === mesActual.anio && cursor.mes === mesActual.mes;
    const rango = { desde: inicioMes(cursor.anio, cursor.mes), hasta: esMesActual ? ahora : inicioMesSiguiente(cursor.anio, cursor.mes) };

    const porProyecto = new Map<string, number[]>();
    for (const [numeroEconomico, periodosUnidad] of periodosPorUnidad) {
      const sla = calcularSlaEnRango(periodosUnidad, rango);
      if (sla.porcentaje === null) continue;
      const proyecto = proyectoPorNumero.get(numeroEconomico) ?? "Sin proyecto";
      const lista = porProyecto.get(proyecto) ?? [];
      lista.push(sla.porcentaje);
      porProyecto.set(proyecto, lista);
    }
    for (const [proyecto, valores] of porProyecto) {
      resultado.push({
        proyecto,
        anio: cursor.anio,
        mes: cursor.mes,
        porcentajePromedio: Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10,
        unidadesConDatos: valores.length,
      });
    }
    cursor = cursor.mes === 12 ? { anio: cursor.anio + 1, mes: 1 } : { anio: cursor.anio, mes: cursor.mes + 1 };
  }
  return resultado.reverse();
}
