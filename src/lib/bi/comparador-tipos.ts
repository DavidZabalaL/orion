// Comparador (métricas × periodos): tipos y lógica pura de fechas, sin
// Prisma — se usa igual en el cliente (pestaña Comparador de Dashboards) y en
// el servidor (src/lib/bi/comparador.ts). Las fechas viajan como
// "YYYY-MM-DD" (día calendario de México); el servidor las convierte a
// instantes con parseFechaLocalMx/finDelDiaMx.
import { BI_DATASETS, obtenerDataset, obtenerCampo, AGREGACION_LABEL, type TipoAgregacion, type FiltroGuardable } from "@/lib/bi/metadata";
import type { ReglaColorColumna } from "@/lib/bi/reglas-color";

export const MAX_METRICAS = 10;
export const MIN_PERIODOS = 2;
export const MAX_PERIODOS = 4;
export const MAX_FILAS_DESGLOSE = 50;

/**
 * Solo datasets con fecha de evento propia se pueden repartir por periodo.
 * shortcut: "Posiciones GPS" queda fuera porque PosicionGPS no tiene índice
 * por timestamp y cada comparación recorrería la tabla completa (millones de
 * filas, ver incidente de cuota de Neon); agregar el índice si se necesita.
 */
export const DATASETS_COMPARABLES = BI_DATASETS.filter((d) => d.fechaActividadExpr && d.id !== "gps_posiciones");

/** Semáforo solo de presentación (no cambia la consulta): sobre el valor de cada periodo y sobre su cambio contra la base (la flecha). */
type ReglasMetrica = { reglasValor?: ReglaColorColumna[]; reglasCambio?: ReglaColorColumna[] };

export type MetricaComparador = (
  | { tipo: "bi"; datasetId: string; campoId: string; agregacion: TipoAgregacion; filtros: FiltroGuardable[]; nombre?: string }
  | { tipo: "sla"; nombre?: string }
) &
  ReglasMetrica;

export type Desglose = "ninguno" | "proyecto" | "unidad";

export const DESGLOSE_LABEL: Record<Desglose, string> = { ninguno: "Sin desglose", proyecto: "Por proyecto", unidad: "Por unidad" };

/** Campo del catálogo BI que se usa para desglosar (todos los datasets comparables tienen "proyecto"; tickets de rescate e insumos no tienen unidad). */
export const CAMPO_DESGLOSE: Record<Exclude<Desglose, "ninguno">, string> = { proyecto: "proyecto", unidad: "numeroEconomico" };

export type AtajoPeriodo =
  | "mes_actual"
  | "mes_anterior"
  | "trimestre_actual"
  | "trimestre_anterior"
  | "anio_actual"
  | "anio_anterior"
  | "periodo_anterior"
  | "mismo_periodo_anio_anterior";

export const ATAJO_LABEL: Record<AtajoPeriodo, string> = {
  mes_actual: "Mes actual",
  mes_anterior: "Mes anterior",
  trimestre_actual: "Trimestre actual",
  trimestre_anterior: "Trimestre anterior",
  anio_actual: "Año actual",
  anio_anterior: "Año anterior",
  periodo_anterior: "Periodo anterior al base",
  mismo_periodo_anio_anterior: "Mismo periodo, año anterior",
};

/** Atajos que dependen del periodo base (el primero) — no aplican al propio periodo base. */
export const ATAJOS_RELATIVOS: AtajoPeriodo[] = ["periodo_anterior", "mismo_periodo_anio_anterior"];

export type Rango = { desde: string; hasta: string };
/** Con `atajo`, desde/hasta se recalculan al abrir (una comparación guardada con "Mes anterior" se recorre sola cada mes). */
export type PeriodoComparador = Rango & { atajo?: AtajoPeriodo };

export type ConfigComparador = {
  metricas: MetricaComparador[];
  periodos: PeriodoComparador[];
  desglose: Desglose;
  /** undefined = todos los proyectos que el rol puede ver. */
  proyectoIds?: string[];
};

export type FilaComparador = { label: string; valores: (number | null)[] };

export type ResultadoMetricaComparador = {
  nombre: string;
  sufijo: string;
  /** Un valor por periodo; null = sin registros en ese periodo (distinto de 0). */
  total: (number | null)[];
  /** Vacío sin desglose. */
  filas: FilaComparador[];
  truncado: boolean;
  aviso?: string;
};

// ───────────── Fechas ("YYYY-MM-DD", aritmética en UTC para no depender de la zona del navegador) ─────────────

const MS_DIA = 86_400_000;

function partes(f: string) {
  const [y, m, d] = f.split("-").map(Number);
  return { y, m, d };
}

function iso(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

function diasDelMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function esFinDeMes(f: string): boolean {
  const { y, m, d } = partes(f);
  return d === diasDelMes(y, m);
}

export function sumarDias(f: string, n: number): string {
  return new Date(Date.parse(f) + n * MS_DIA).toISOString().slice(0, 10);
}

/** Mueve N meses: un fin de mes se queda en fin de mes y el día se recorta al último del mes destino (31-mar − 1 mes = 28/29-feb). */
export function moverMeses(f: string, n: number): string {
  const { y, m, d } = partes(f);
  const total = y * 12 + (m - 1) + n;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  const ultimo = diasDelMes(ty, tm);
  return iso(ty, tm, esFinDeMes(f) ? ultimo : Math.min(d, ultimo));
}

/** Días calendario del rango, ambos extremos incluidos. */
export function diasDelRango(r: Rango): number {
  return Math.round((Date.parse(r.hasta) - Date.parse(r.desde)) / MS_DIA) + 1;
}

export function fechaValida(f: unknown): f is string {
  if (typeof f !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const { y, m, d } = partes(f);
  return iso(y, m, d) === f;
}

/** Calcula desde/hasta de un atajo. Los relativos ("periodo anterior", "año anterior") se calculan sobre `base`. */
export function resolverAtajo(atajo: AtajoPeriodo, hoy: string, base?: PeriodoComparador): Rango | null {
  const { y, m } = partes(hoy);
  const inicioMes = iso(y, m, 1);
  const inicioTrimestre = iso(y, Math.floor((m - 1) / 3) * 3 + 1, 1);
  switch (atajo) {
    case "mes_actual":
      return { desde: inicioMes, hasta: hoy };
    case "mes_anterior":
      return { desde: moverMeses(inicioMes, -1), hasta: sumarDias(inicioMes, -1) };
    case "trimestre_actual":
      return { desde: inicioTrimestre, hasta: hoy };
    case "trimestre_anterior":
      return { desde: moverMeses(inicioTrimestre, -3), hasta: sumarDias(inicioTrimestre, -1) };
    case "anio_actual":
      return { desde: iso(y, 1, 1), hasta: hoy };
    case "anio_anterior":
      return { desde: iso(y - 1, 1, 1), hasta: iso(y - 1, 12, 31) };
    case "mismo_periodo_anio_anterior":
      return base ? { desde: moverMeses(base.desde, -12), hasta: moverMeses(base.hasta, -12) } : null;
    case "periodo_anterior": {
      if (!base) return null;
      // Base que arranca en día 1 (mes, trimestre, año o "lo que va de"): se
      // recorre en meses completos — "1–9 nov" queda contra "1–9 oct", no
      // contra los 9 días previos.
      if (partes(base.desde).d === 1) {
        const b = partes(base.desde);
        const h = partes(base.hasta);
        const meses = base.atajo?.startsWith("trimestre") ? 3 : base.atajo?.startsWith("anio") ? 12 : h.y * 12 + h.m - (b.y * 12 + b.m) + 1;
        return { desde: moverMeses(base.desde, -meses), hasta: moverMeses(base.hasta, -meses) };
      }
      const dias = diasDelRango(base);
      return { desde: sumarDias(base.desde, -dias), hasta: sumarDias(base.desde, -1) };
    }
  }
}

/** Recalcula los periodos que tienen atajo. El primero es la base; si trae un atajo relativo (inválido para la base) se respeta su rango fijo. */
export function resolverPeriodos(periodos: PeriodoComparador[], hoy: string): PeriodoComparador[] {
  if (periodos.length === 0) return [];
  const [primero, ...resto] = periodos;
  const base: PeriodoComparador =
    primero.atajo && !ATAJOS_RELATIVOS.includes(primero.atajo) ? { ...primero, ...resolverAtajo(primero.atajo, hoy) } : primero;
  return [base, ...resto.map((p) => (p.atajo ? { ...p, ...(resolverAtajo(p.atajo, hoy, base) ?? {}) } : p))];
}

/** Diferencia y % contra el periodo base; null si falta alguno de los dos (o el % cuando la base es 0). */
export function variacion(base: number | null, valor: number | null): { diferencia: number | null; pct: number | null } {
  if (base === null || valor === null) return { diferencia: null, pct: null };
  return { diferencia: valor - base, pct: base === 0 ? null : (valor - base) / Math.abs(base) };
}

/**
 * Número contra el que se evalúan las reglas de color del cambio, igual a lo
 * que se ve en pantalla: % contra la base (12.5 = +12.5%), o puntos si la
 * métrica ya es un %. Desde una base 0 cualquier alza/baja vale ±∞, para que
 * «Mayor que 10» también marque pasar de 0 a 17.
 */
export function cambioParaRegla(base: number | null, valor: number | null, esPorcentaje: boolean): number | null {
  const { diferencia, pct } = variacion(base, valor);
  if (diferencia === null) return null;
  if (esPorcentaje) return Math.round(diferencia * 100) / 100;
  if (pct === null) return diferencia === 0 ? 0 : Math.sign(diferencia) * Infinity;
  return Math.round(pct * 1000) / 10;
}

const FMT_DIA = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const FMT_DIA_ANIO = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "1 oct – 31 oct 2026" (o "15 dic 2025 – 14 ene 2026" si cruza de año). */
export function etiquetaRango(r: Rango): string {
  const mismoAnio = r.desde.slice(0, 4) === r.hasta.slice(0, 4);
  const desde = (mismoAnio ? FMT_DIA : FMT_DIA_ANIO).format(new Date(`${r.desde}T00:00:00Z`));
  return `${desde} – ${FMT_DIA_ANIO.format(new Date(`${r.hasta}T00:00:00Z`))}`;
}

// ───────────── Métricas ─────────────

export const NOMBRE_SLA = "Disponibilidad (SLA %)";

/** Nombre visible de una métrica: el de la métrica guardada si viene de ahí, si no "Costo (Suma) · Combustible". */
export function nombreMetrica(m: MetricaComparador): string {
  if (m.nombre) return m.nombre;
  if (m.tipo === "sla") return NOMBRE_SLA;
  const dataset = obtenerDataset(m.datasetId);
  const campo = dataset && obtenerCampo(dataset, m.campoId);
  if (!dataset || !campo) return "Métrica desconocida";
  const base = m.agregacion === "conteo" ? "N° de registros" : `${campo.label} (${AGREGACION_LABEL[m.agregacion]})`;
  const filtros = m.filtros.length > 0 ? " (filtrado)" : "";
  return `${base} · ${dataset.label}${filtros}`;
}
