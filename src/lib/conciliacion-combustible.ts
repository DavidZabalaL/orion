// Conciliación 1 a 1 entre el checklist de carga de combustible (lo que reporta
// el operador) y la transacción real (Efectivale/captura en Combustible).
// Regla pedida: sin tolerancia — litros e importe deben coincidir al centavo.

// INCOMPLETO: checklist del formulario anterior (hasta oct-2026) que no pedía litros ni importe — no se puede comparar.
export type EstadoConciliacion = "CONCILIADA" | "DIFERENCIA" | "INCOMPLETO" | "SIN_CHECKLIST" | "SIN_TRANSACCION" | "PENDIENTE";

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
const centavos = (n: number | null) => (n === null || !Number.isFinite(n) ? null : Math.round(n * 100));
const coincide = (c: ChecklistCarga, t: TransaccionCarga) => centavos(c.litros) === centavos(t.litros) && centavos(c.importe) === centavos(t.importe);

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
