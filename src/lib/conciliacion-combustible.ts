// Conciliación 1 a 1 entre el checklist de carga de combustible (lo que reporta
// el operador) y la transacción real (Efectivale/captura en Combustible).
import { fmtFechaHora } from "@/lib/formato";
import type { HojaExcel } from "@/lib/exportar-excel";

/** Tolerancia acordada: diferencias de lectura entre la bomba y Efectivale. */
export const TOLERANCIA_LITROS = 1;
export const TOLERANCIA_IMPORTE = 2;

// INCOMPLETO: checklist del formulario anterior (hasta oct-2026) que no pedía litros ni importe — no se puede comparar.
export type EstadoConciliacion = "CONCILIADA" | "DIFERENCIA" | "INCOMPLETO" | "SIN_CHECKLIST" | "SIN_TRANSACCION" | "PENDIENTE";

export const ETIQUETA_ESTADO: Record<EstadoConciliacion, string> = {
  CONCILIADA: "Conciliada",
  DIFERENCIA: "Con diferencia",
  SIN_CHECKLIST: "Carga sin checklist",
  SIN_TRANSACCION: "Checklist sin transacción",
  PENDIENTE: "Pendiente de importar",
  INCOMPLETO: "Checklist sin litros/importe",
};

export type ChecklistCarga = { id: string; numeroEconomico: string; fecha: Date; litros: number | null; importe: number | null };
export type TransaccionCarga = { id: string; numeroEconomico: string; fecha: Date; litros: number; importe: number; estacion: string | null };
export type FilaConciliacion = {
  estado: EstadoConciliacion;
  numeroEconomico: string;
  fecha: Date;
  checklist: ChecklistCarga | null;
  transaccion: TransaccionCarga | null;
};

const OFFSET_MX_MS = 6 * 60 * 60 * 1000;
/** Día calendario en hora de México, como número de días — para comparar "mismo día ± 1". */
const diaMx = (d: Date) => Math.floor((d.getTime() - OFFSET_MX_MS) / 86_400_000);
// Se compara en centavos para que 1.00 L / $2.00 exactos entren en la tolerancia sin errores de punto flotante.
const centavos = (n: number) => Math.round(n * 100);
const coincide = (c: ChecklistCarga, t: TransaccionCarga) =>
  c.litros !== null &&
  c.importe !== null &&
  Math.abs(centavos(c.litros) - centavos(t.litros)) <= TOLERANCIA_LITROS * 100 &&
  Math.abs(centavos(c.importe) - centavos(t.importe)) <= TOLERANCIA_IMPORTE * 100;

/**
 * `coberturaHasta`: fecha de la transacción importada más reciente. Un checklist
 * posterior todavía no tiene contra qué compararse → PENDIENTE, no alerta.
 */
export function conciliarCargas(checklists: ChecklistCarga[], transacciones: TransaccionCarga[], coberturaHasta: Date | null): FilaConciliacion[] {
  const libres = new Set(transacciones.map((t) => t.id));
  const porUnidad = new Map<string, TransaccionCarga[]>();
  for (const t of transacciones) porUnidad.set(t.numeroEconomico, [...(porUnidad.get(t.numeroEconomico) ?? []), t]);
  const candidatas = (c: ChecklistCarga) =>
    (porUnidad.get(c.numeroEconomico) ?? []).filter((t) => libres.has(t.id) && Math.abs(diaMx(t.fecha) - diaMx(c.fecha)) <= 1);

  const filas: FilaConciliacion[] = [];
  const sinPareja: ChecklistCarga[] = [];

  // 1a pasada: coincidencias exactas, para que una diferencia no "robe" la transacción de otro checklist.
  for (const c of checklists) {
    const exacta = candidatas(c).find((t) => coincide(c, t));
    if (exacta) {
      libres.delete(exacta.id);
      filas.push({ estado: "CONCILIADA", numeroEconomico: c.numeroEconomico, fecha: c.fecha, checklist: c, transaccion: exacta });
    } else {
      sinPareja.push(c);
    }
  }

  // 2a pasada: misma unidad y día pero montos distintos → DIFERENCIA con la de litros más parecidos
  // (o la más cercana en tiempo si el checklist no trae litros/importe).
  for (const c of sinPareja) {
    const incompleto = c.litros === null || c.importe === null;
    const distancia = (t: TransaccionCarga) => (incompleto ? Math.abs(t.fecha.getTime() - c.fecha.getTime()) : Math.abs(t.litros - c.litros!));
    const [cercana] = candidatas(c).sort((a, b) => distancia(a) - distancia(b));
    if (cercana) {
      libres.delete(cercana.id);
      filas.push({ estado: incompleto ? "INCOMPLETO" : "DIFERENCIA", numeroEconomico: c.numeroEconomico, fecha: c.fecha, checklist: c, transaccion: cercana });
    } else {
      const pendiente = !coberturaHasta || diaMx(c.fecha) > diaMx(coberturaHasta);
      filas.push({ estado: pendiente ? "PENDIENTE" : "SIN_TRANSACCION", numeroEconomico: c.numeroEconomico, fecha: c.fecha, checklist: c, transaccion: null });
    }
  }

  for (const t of transacciones) {
    if (libres.has(t.id)) filas.push({ estado: "SIN_CHECKLIST", numeroEconomico: t.numeroEconomico, fecha: t.fecha, checklist: null, transaccion: t });
  }

  return filas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || a.numeroEconomico.localeCompare(b.numeroEconomico));
}

type FilaSerializable = {
  estado: EstadoConciliacion;
  numeroEconomico: string;
  fecha: Date | string;
  checklist: { litros: number | null; importe: number | null } | null;
  transaccion: { fecha: Date | string; litros: number; importe: number; estacion: string | null } | null;
};

/** Diferencia checklist − transacción redondeada a centavos; null si falta alguno de los dos. */
export const diferencia = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : Math.round((a - b) * 100) / 100);

/** Misma tabla que la vista, para la descarga y el adjunto del correo. */
export function hojaConciliacion(filas: FilaSerializable[]): HojaExcel {
  return {
    nombre: "Conciliación",
    headers: ["Fecha", "Unidad", "Estado", "Litros checklist", "Importe checklist", "Litros transacción", "Importe transacción", "Dif. litros", "Dif. importe", "Estación"],
    filas: filas.map((f) => [
      fmtFechaHora(f.transaccion?.fecha ?? f.fecha),
      f.numeroEconomico,
      ETIQUETA_ESTADO[f.estado],
      f.checklist?.litros ?? "",
      f.checklist?.importe ?? "",
      f.transaccion?.litros ?? "",
      f.transaccion?.importe ?? "",
      diferencia(f.checklist?.litros, f.transaccion?.litros) ?? "",
      diferencia(f.checklist?.importe, f.transaccion?.importe) ?? "",
      f.transaccion?.estacion ?? "",
    ]),
  };
}
