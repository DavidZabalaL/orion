import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { FuenteKmRecorridos } from "@/generated/prisma/enums";
import { tieneHoraMx } from "@/lib/timezone";

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
/**
 * El rendimiento de referencia es el percentil 25 de las últimas N cargas con
 * km conocido — incluidas las de 0 km o rendimiento < 1 (ralentí, pluma de
 * grúa): sacarlas inflaba la referencia 30–50% y el consumo estimado salía
 * bajo. El percentil 25 supone consumo alto a propósito: la alerta solo debe
 * saltar cuando ni con ese consumo cabe lo cargado.
 */
const VENTANA_CARGAS_REFERENCIA = 10;
const MIN_CARGAS_REFERENCIA = 3;
const PERCENTIL_REFERENCIA = 0.25;
/** Km capturados menores a esto entre cargas de días distintos son casi siempre un odómetro mal tecleado (+1), no un dato real. */
const MIN_KM_CAPTURA_CONFIABLE = 20;
/** Una lectura GPS más vieja que esto respecto a la carga ya no dice cuánto marcaba el odómetro en ese momento. */
const MAX_ANTIGUEDAD_LECTURA_GPS_MS = 48 * 60 * 60 * 1000;
/**
 * El odómetro GPS solo se usa en cargas desde esta fecha (00:00 de México).
 * Hay lecturas desde mediados de septiembre, pero por decisión de negocio el
 * cálculo con GPS arranca el 1 de octubre de 2026 y no se aplica en retroactivo:
 * las cargas anteriores se calculan solo con el km capturado. Para la primera
 * carga de octubre sí se lee el odómetro GPS de su carga anterior (aunque sea
 * de septiembre) como punto de partida — si no, ninguna unidad empezaría
 * octubre con km de GPS.
 */
export const INICIO_KM_GPS = new Date("2026-10-01T06:00:00Z");
const MAX_KM_ENTRE_CARGAS = 5000;

export function rendimientoEnRango(r: number | null | undefined): r is number {
  return r != null && Number.isFinite(r) && r >= RENDIMIENTO_MIN_KM_L && r <= RENDIMIENTO_MAX_KM_L;
}

function percentil(valores: number[], p: number): number {
  const orden = [...valores].sort((a, b) => a - b);
  const pos = (orden.length - 1) * p;
  const base = Math.floor(pos);
  const resto = pos - base;
  return orden[base + 1] !== undefined ? orden[base] + resto * (orden[base + 1] - orden[base]) : orden[base];
}

const OFFSET_MX_MS = 6 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
/** Día calendario en México (las fechas se guardan como instante UTC). */
const diaMx = (f: Date) => Math.floor((f.getTime() - OFFSET_MX_MS) / DIA_MS);
const mismoDia = (a: Date, b: Date) => diaMx(a) === diaMx(b);

export { tieneHoraMx };

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
 * - Consumo entre cargas: km recorridos ÷ rendimiento de referencia de la
 *   unidad (percentil 25 de sus últimas cargas); si aún no hay suficientes, el de la ficha.
 * - Nivel antes de la carga: lo que dejó la carga ANTERIOR (como si se hubiera
 *   hecho con tanque vacío) menos lo consumido. No se arrastra el nivel
 *   estimado de cargas más viejas: cada error se acumulaba y el tanque
 *   "estimado" quedaba pegado al tope, alertando carga tras carga. Así el
 *   nivel es una cota inferior: si aun así no cabe lo cargado, el exceso es real.
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
  const conKm: number[] = [];

  for (let i = 0; i < cargas.length; i++) {
    const carga = cargas[i];
    const previa = i > 0 ? cargas[i - 1] : null;
    const estimadoPrevio = i > 0 ? resultado[i - 1] : null;

    const aplicaGps = carga.fecha >= INICIO_KM_GPS;
    const siguienteAplica = i + 1 < cargas.length && cargas[i + 1].fecha >= INICIO_KM_GPS;
    const kmGps = aplicaGps || siguienteAplica ? kmGpsAl(lecturas, carga.fecha.getTime()) : null;
    let kmRecorridos: number | null = null;
    let fuenteKmRecorridos: FuenteKmRecorridos | null = null;

    // Misma marca de tiempo (dos cargas del mismo día importadas sin hora) =
    // el GPS no distingue cuánto se movió entre ellas: se recurre al km capturado.
    if (aplicaGps && previa && estimadoPrevio?.kmGps != null && kmGps != null && carga.fecha.getTime() > previa.fecha.getTime()) {
      const diferencia = kmGps - estimadoPrevio.kmGps;
      if (diferencia >= 0 && diferencia <= MAX_KM_ENTRE_CARGAS) {
        kmRecorridos = diferencia;
        fuenteKmRecorridos = "GPS";
      }
    }
    if (kmRecorridos === null && previa?.kmActual != null && carga.kmActual != null) {
      const diferencia = carga.kmActual - previa.kmActual;
      const sospechoso = diferencia < MIN_KM_CAPTURA_CONFIABLE && !mismoDia(carga.fecha, previa.fecha);
      if (diferencia >= 0 && diferencia <= MAX_KM_ENTRE_CARGAS && !sospechoso) {
        kmRecorridos = diferencia;
        fuenteKmRecorridos = "CAPTURA";
      }
    }

    const rendimientoCrudo = kmRecorridos !== null && carga.litros > 0 ? kmRecorridos / carga.litros : null;
    const rendimientoCalculado = rendimientoEnRango(rendimientoCrudo) ? redondear2(rendimientoCrudo) : null;

    const ventana = conKm.slice(-VENTANA_CARGAS_REFERENCIA);
    const rendimientoReferencia =
      ventana.length >= MIN_CARGAS_REFERENCIA
        ? percentil(ventana, PERCENTIL_REFERENCIA)
        : rendimientoEnRango(rendimientoFicha)
          ? rendimientoFicha
          : null;

    let nivelEstimadoDespues: number | null = null;
    let alertaSobrellenado = false;
    if (capacidadTanqueLitros) {
      // Con referencia 0 (la unidad gastó sin moverse) no se puede descontar
      // consumo con km: se asume que pudo vaciar el tanque.
      const nivelAntes =
        previa && kmRecorridos !== null && rendimientoReferencia && rendimientoReferencia > 0
          ? Math.max(0, Math.min(previa.litros, capacidadTanqueLitros) - kmRecorridos / rendimientoReferencia)
          : 0;
      const nivel = redondear2(nivelAntes + carga.litros);
      nivelEstimadoDespues = nivel < 9999.99 ? nivel : null;
      alertaSobrellenado = nivel > capacidadTanqueLitros * TOLERANCIA_SOBRELLENADO;
    }

    if (rendimientoCrudo !== null && rendimientoCrudo <= RENDIMIENTO_MAX_KM_L) conKm.push(rendimientoCrudo);
    resultado.push({ kmGps, kmRecorridos, fuenteKmRecorridos, rendimientoCalculado, nivelEstimadoDespues, alertaSobrellenado });
  }
  return resultado;
}

/**
 * Validación contra el GPS. La carga se registra por día (sin hora), así que
 * el GPS no da un número exacto sino un rango: lo mínimo que pudo recorrer
 * (de que terminó el día de la carga anterior a que empezó el de esta) y lo
 * máximo (del inicio de aquel día al final de este). Se avisa si el km
 * capturado cae fuera de ese rango por más de esta holgura.
 */
const DISCREPANCIA_GPS_PCT = 0.15;
const DISCREPANCIA_GPS_MIN_KM = 50;

export type CargaParaExplicar = {
  id: string;
  fecha: Date;
  createdAt: Date;
  litros: number;
  kmActual: number | null;
  kmRecorridos: number | null;
  fuenteKmRecorridos: FuenteKmRecorridos | null;
  nivelEstimadoDespues: number | null;
  alertaSobrellenado: boolean;
  /** Odómetro GPS al inicio del día de la carga (Combustible.kmGps). */
  kmGps: number | null;
  /** Odómetro GPS más alto registrado durante el día de la carga; null si ese día no reportó. Solo se usa en cargas sin hora (ver tieneHoraMx). */
  kmGpsFinDia: number | null;
};

export type ExplicacionCarga = {
  /** Km recorridos según el odómetro capturado (aunque se haya usado el GPS). */
  kmCapturaRecorridos: number | null;
  /** Razón breve de la alerta de sobrellenado (para el hover); null si no hay alerta. */
  motivoSobrellenado: string | null;
  /** Razón breve de la discrepancia km capturado vs. GPS; null si coinciden o no hay con qué comparar. */
  discrepanciaGps: string | null;
};

const fmtL = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} L`;
const fmtKm = (n: number) => `${n.toLocaleString("es-MX")} km`;

/**
 * Textos para la vista de combustible a partir de lo ya guardado por
 * recalcularCombustibleUnidad — no recalcula la regla, solo la explica.
 * `cargas` son las de UNA unidad, en cualquier orden.
 */
export function explicarCargasUnidad(cargas: CargaParaExplicar[], capacidadTanqueLitros: number | null): Map<string, ExplicacionCarga> {
  const orden = [...cargas].sort(
    (a, b) =>
      a.fecha.getTime() - b.fecha.getTime() ||
      (a.kmActual ?? Number.MAX_SAFE_INTEGER) - (b.kmActual ?? Number.MAX_SAFE_INTEGER) ||
      a.createdAt.getTime() - b.createdAt.getTime()
  );
  const resultado = new Map<string, ExplicacionCarga>();
  orden.forEach((c, i) => {
    const previa = i > 0 ? orden[i - 1] : null;
    const kmCapturaRecorridos = previa?.kmActual != null && c.kmActual != null && c.kmActual >= previa.kmActual ? c.kmActual - previa.kmActual : null;

    let discrepanciaGps: string | null = null;
    // Con hora, el odómetro GPS es el del momento de la carga (rango de un
    // solo punto); sin hora, se acota con el inicio y el final de ese día.
    // Sin lecturas en el día de una carga sin hora no se valida: kmGps puede
    // ser una lectura vieja compartida por las dos cargas ("0 km" falso).
    const finDe = (x: CargaParaExplicar) => (tieneHoraMx(x.fecha) ? x.kmGps : x.kmGpsFinDia);
    const finPrevia = previa ? finDe(previa) : null;
    const finActual = finDe(c);
    if (
      c.fuenteKmRecorridos === "GPS" &&
      c.kmRecorridos != null &&
      kmCapturaRecorridos != null &&
      previa?.kmGps != null &&
      finPrevia != null &&
      c.kmGps != null &&
      finActual != null
    ) {
      const minimo = Math.max(0, c.kmGps - finPrevia);
      const maximo = finActual - previa.kmGps;
      const holgura = Math.max(DISCREPANCIA_GPS_MIN_KM, maximo * DISCREPANCIA_GPS_PCT);
      if (kmCapturaRecorridos < minimo - holgura || kmCapturaRecorridos > maximo + holgura) {
        const rango = minimo === maximo ? fmtKm(maximo) : `entre ${minimo.toLocaleString("es-MX")} y ${fmtKm(maximo)}`;
        discrepanciaGps = `Capturado: ${fmtKm(kmCapturaRecorridos)} desde la carga anterior; GPS: ${rango}.`;
      }
    }

    let motivoSobrellenado: string | null = null;
    if (c.alertaSobrellenado && capacidadTanqueLitros) {
      const limite = capacidadTanqueLitros * TOLERANCIA_SOBRELLENADO;
      const nivel = c.nivelEstimadoDespues ?? c.litros;
      const restante = Math.max(0, nivel - c.litros);
      motivoSobrellenado =
        restante < 0.5 || !previa
          ? `${fmtL(c.litros)} en una sola carga; tanque de ${fmtL(capacidadTanqueLitros)} (máx. ${fmtL(limite)} con +15%).`
          : `~${fmtL(restante)} restantes (carga anterior de ${fmtL(previa.litros)}, ${c.kmRecorridos != null ? fmtKm(c.kmRecorridos) : "km desconocidos"} después) + ${fmtL(c.litros)} = ${fmtL(nivel)}; tanque de ${fmtL(capacidadTanqueLitros)} (máx. ${fmtL(limite)}).`;
      if (c.fuenteKmRecorridos !== "GPS") {
        motivoSobrellenado +=
          c.fecha < INICIO_KM_GPS
            ? " Aún no se tenían datos de GPS: calculado con el km capturado."
            : " Sin lectura de GPS para esta carga: calculado con el km capturado.";
      }
    }

    resultado.set(c.id, { kmCapturaRecorridos, motivoSobrellenado, discrepanciaGps });
  });
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
    where: { numeroEconomico, esAnomalo: false, kmValidado: { not: null }, timestamp: { gte: new Date(Math.max(primera, INICIO_KM_GPS.getTime() - 60 * DIA_MS) - MAX_ANTIGUEDAD_LECTURA_GPS_MS), lte: new Date(ultima) } },
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
    // Un solo UPDATE ... FROM (VALUES ...) por lote: una ida a la base y atómico.
    // Con un update por fila dentro de $transaction, la latencia a Neon rebasaba
    // el límite de 5 s de la transacción en unidades con muchas cargas.
    for (let i = 0; i < actualizaciones.length; i += 200) {
      const valores = Prisma.join(
        actualizaciones.slice(i, i + 200).map(
          ({ id, data: d }) =>
            Prisma.sql`(${id}, ${d.kmGps}::int, ${d.kmRecorridos}::int, ${d.fuenteKmRecorridos}::text, ${d.rendimientoCalculado}::numeric, ${d.nivelEstimadoDespues}::numeric, ${d.alertaSobrellenado}::boolean)`
        )
      );
      await prisma.$executeRaw`
        UPDATE "Combustible" AS c SET
          "kmGps" = v.km_gps,
          "kmRecorridos" = v.km_recorridos,
          "fuenteKmRecorridos" = v.fuente::"FuenteKmRecorridos",
          "rendimientoCalculado" = v.rendimiento,
          "nivelEstimadoDespues" = v.nivel,
          "alertaSobrellenado" = v.alerta
        FROM (VALUES ${valores}) AS v(id, km_gps, km_recorridos, fuente, rendimiento, nivel, alerta)
        WHERE c.id = v.id`;
    }
  }
  return { cambios: actualizaciones.length, estimados: porId, antes };
}
