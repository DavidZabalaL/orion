import { prisma } from "@/lib/prisma";
import type { FuenteKmRecorridos } from "@/generated/prisma/enums";

/**
 * Rango físicamente razonable; fuera de él casi siempre es un km mal capturado.
 * El mínimo es bajo a propósito: una grúa gasta combustible operando la pluma y
 * en ralentí, y en la práctica rinde ~2 km/L — con un mínimo de 2 se descartaba
 * la mitad de sus cargas reales e inflaba su rendimiento de referencia.
 */
export const RENDIMIENTO_MIN_KM_L = 1;
export const RENDIMIENTO_MAX_KM_L = 30;
/**
 * Holgura sobre la capacidad: el nivel es un estimado (km entre cargas ÷
 * rendimiento) y ni tanques ni bombas son exactos. Con datos reales a 5% alertaba
 * ~22% de las cargas; 15% deja solo excesos claros (≈11 L en un tanque de 76 L).
 */
const TOLERANCIA_SOBRELLENADO = 1.15;
/** El rendimiento de referencia sale de las últimas N cargas válidas, ponderado por litros. */
const VENTANA_CARGAS_REFERENCIA = 10;
const MIN_CARGAS_REFERENCIA = 3;
/** Una lectura GPS más vieja que esto respecto a la carga ya no dice cuánto marcaba el odómetro en ese momento. */
const MAX_ANTIGUEDAD_LECTURA_GPS_MS = 48 * 60 * 60 * 1000;
const MAX_KM_ENTRE_CARGAS = 5000;

export function rendimientoEnRango(r: number | null | undefined): r is number {
  return r != null && Number.isFinite(r) && r >= RENDIMIENTO_MIN_KM_L && r <= RENDIMIENTO_MAX_KM_L;
}

export type CargaParaEstimar = { id: string; fecha: Date; litros: number; kmActual: number | null };
export type LecturaGps = { t: number; km: number };
export type EstimadoCarga = {
  kmGps: number | null;
  kmRecorridos: number | null;
  fuenteKmRecorridos: FuenteKmRecorridos | null;
  rendimientoCalculado: number | null;
  nivelEstimadoDespues: number | null;
  alertaSobrellenado: boolean;
};

const redondear2 = (n: number) => Math.round(n * 100) / 100;

function kmGpsAl(lecturas: LecturaGps[], t: number): number | null {
  let lo = 0;
  let hi = lecturas.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lecturas[mid].t <= t) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (idx === -1 || t - lecturas[idx].t > MAX_ANTIGUEDAD_LECTURA_GPS_MS) return null;
  return lecturas[idx].km;
}

/**
 * Calcula en cadena (cargas en orden cronológico) km recorridos, rendimiento,
 * nivel estimado de tanque y alerta de sobrellenado de una unidad.
 *
 * - Km recorridos: diferencia del odómetro GPS validado entre esta carga y la
 *   anterior; si no hay GPS confiable, diferencia del km capturado.
 * - Rendimiento: km recorridos ÷ litros, solo si cae en el rango razonable.
 * - Consumo entre cargas: km recorridos ÷ rendimiento real de la unidad (sus
 *   últimas cargas válidas); si aún no hay suficientes, el de la ficha.
 * - Sin km o sin rendimiento de referencia no se puede saber cuánto quedaba: se
 *   asume tanque vacío, así solo alerta una carga que por sí sola excede la capacidad.
 */
export function estimarCadenaCargas(
  cargas: CargaParaEstimar[],
  lecturas: LecturaGps[],
  capacidadTanqueLitros: number | null,
  rendimientoFicha: number | null
): EstimadoCarga[] {
  const resultado: EstimadoCarga[] = [];
  const validas: { km: number; litros: number }[] = [];

  for (let i = 0; i < cargas.length; i++) {
    const carga = cargas[i];
    const previa = i > 0 ? cargas[i - 1] : null;
    const estimadoPrevio = i > 0 ? resultado[i - 1] : null;

    const kmGps = kmGpsAl(lecturas, carga.fecha.getTime());
    let kmRecorridos: number | null = null;
    let fuenteKmRecorridos: FuenteKmRecorridos | null = null;

    // Misma marca de tiempo (dos cargas del mismo día importadas sin hora) =
    // el GPS no distingue cuánto se movió entre ellas: se recurre al km capturado.
    if (previa && estimadoPrevio?.kmGps != null && kmGps != null && carga.fecha.getTime() > previa.fecha.getTime()) {
      const diferencia = kmGps - estimadoPrevio.kmGps;
      if (diferencia >= 0 && diferencia <= MAX_KM_ENTRE_CARGAS) {
        kmRecorridos = diferencia;
        fuenteKmRecorridos = "GPS";
      }
    }
    if (kmRecorridos === null && previa?.kmActual != null && carga.kmActual != null) {
      const diferencia = carga.kmActual - previa.kmActual;
      if (diferencia >= 0 && diferencia <= MAX_KM_ENTRE_CARGAS) {
        kmRecorridos = diferencia;
        fuenteKmRecorridos = "CAPTURA";
      }
    }

    const rendimientoCrudo = kmRecorridos !== null && carga.litros > 0 ? kmRecorridos / carga.litros : null;
    const rendimientoCalculado = rendimientoEnRango(rendimientoCrudo) ? redondear2(rendimientoCrudo) : null;

    const ventana = validas.slice(-VENTANA_CARGAS_REFERENCIA);
    const litrosVentana = ventana.reduce((acc, v) => acc + v.litros, 0);
    const rendimientoReferencia =
      ventana.length >= MIN_CARGAS_REFERENCIA && litrosVentana > 0
        ? ventana.reduce((acc, v) => acc + v.km, 0) / litrosVentana
        : rendimientoEnRango(rendimientoFicha)
          ? rendimientoFicha
          : null;

    let nivelEstimadoDespues: number | null = null;
    let alertaSobrellenado = false;
    if (capacidadTanqueLitros) {
      const nivelAntes =
        estimadoPrevio?.nivelEstimadoDespues != null && kmRecorridos !== null && rendimientoReferencia
          ? Math.max(0, Math.min(estimadoPrevio.nivelEstimadoDespues, capacidadTanqueLitros) - kmRecorridos / rendimientoReferencia)
          : 0;
      const nivel = redondear2(nivelAntes + carga.litros);
      nivelEstimadoDespues = nivel < 9999.99 ? nivel : null;
      alertaSobrellenado = nivel > capacidadTanqueLitros * TOLERANCIA_SOBRELLENADO;
    }

    if (rendimientoCalculado !== null && kmRecorridos !== null) validas.push({ km: kmRecorridos, litros: carga.litros });
    resultado.push({ kmGps, kmRecorridos, fuenteKmRecorridos, rendimientoCalculado, nivelEstimadoDespues, alertaSobrellenado });
  }
  return resultado;
}

const mismoNumero = (a: unknown, b: number | null) => (a == null ? b == null : b != null && Math.abs(Number(a) - b) < 0.005);

/**
 * Recalcula todas las cargas de una unidad y guarda solo las que cambiaron.
 * Única fuente de este cálculo: captura manual, importación, asignación de
 * pendientes, eliminación y el recálculo histórico pasan por aquí. Dos consultas
 * de lectura por unidad (cargas + lecturas GPS), nunca una por carga.
 */
export async function recalcularCombustibleUnidad(
  numeroEconomico: string,
  { aplicar = true }: { aplicar?: boolean } = {}
): Promise<{ cambios: number; estimados: Map<string, EstimadoCarga>; antes: Map<string, EstimadoCarga> }> {
  const vacio = { cambios: 0, estimados: new Map<string, EstimadoCarga>(), antes: new Map<string, EstimadoCarga>() };
  const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { capacidadTanqueLitros: true, rendimientoPromedio: true } });
  if (!unidad) return vacio;

  const filas = await prisma.combustible.findMany({
    where: { numeroEconomico },
    select: {
      id: true, fecha: true, createdAt: true, litros: true, kmActual: true,
      kmGps: true, kmRecorridos: true, fuenteKmRecorridos: true, rendimientoCalculado: true, nivelEstimadoDespues: true, alertaSobrellenado: true,
    },
  });
  if (filas.length === 0) return vacio;
  filas.sort(
    (a, b) =>
      a.fecha.getTime() - b.fecha.getTime() ||
      (a.kmActual ?? Number.MAX_SAFE_INTEGER) - (b.kmActual ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );

  const primera = filas[0].fecha.getTime();
  const ultima = filas[filas.length - 1].fecha.getTime();
  const posiciones = await prisma.posicionGPS.findMany({
    where: { numeroEconomico, esAnomalo: false, kmValidado: { not: null }, timestamp: { gte: new Date(primera - MAX_ANTIGUEDAD_LECTURA_GPS_MS), lte: new Date(ultima) } },
    select: { timestamp: true, kmValidado: true },
    orderBy: { timestamp: "asc" },
  });
  const lecturas: LecturaGps[] = posiciones.map((p) => ({ t: p.timestamp.getTime(), km: p.kmValidado as number }));

  const estimados = estimarCadenaCargas(
    filas.map((f) => ({ id: f.id, fecha: f.fecha, litros: Number(f.litros), kmActual: f.kmActual })),
    lecturas,
    unidad.capacidadTanqueLitros ? Number(unidad.capacidadTanqueLitros) : null,
    unidad.rendimientoPromedio ? Number(unidad.rendimientoPromedio) : null
  );

  const porId = new Map<string, EstimadoCarga>();
  const antes = new Map<string, EstimadoCarga>();
  const actualizaciones: { id: string; data: EstimadoCarga }[] = [];
  filas.forEach((f, i) => {
    const e = estimados[i];
    porId.set(f.id, e);
    antes.set(f.id, {
      kmGps: f.kmGps, kmRecorridos: f.kmRecorridos, fuenteKmRecorridos: f.fuenteKmRecorridos,
      rendimientoCalculado: f.rendimientoCalculado != null ? Number(f.rendimientoCalculado) : null,
      nivelEstimadoDespues: f.nivelEstimadoDespues != null ? Number(f.nivelEstimadoDespues) : null,
      alertaSobrellenado: f.alertaSobrellenado,
    });
    const igual =
      f.kmGps === e.kmGps &&
      f.kmRecorridos === e.kmRecorridos &&
      f.fuenteKmRecorridos === e.fuenteKmRecorridos &&
      mismoNumero(f.rendimientoCalculado, e.rendimientoCalculado) &&
      mismoNumero(f.nivelEstimadoDespues, e.nivelEstimadoDespues) &&
      f.alertaSobrellenado === e.alertaSobrellenado;
    if (!igual) actualizaciones.push({ id: f.id, data: e });
  });

  if (aplicar) {
    for (let i = 0; i < actualizaciones.length; i += 50) {
      await prisma.$transaction(actualizaciones.slice(i, i + 50).map((u) => prisma.combustible.update({ where: { id: u.id }, data: u.data })));
    }
  }
  return { cambios: actualizaciones.length, estimados: porId, antes };
}
