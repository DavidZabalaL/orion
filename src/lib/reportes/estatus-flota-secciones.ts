/**
 * Secciones del PDF de "Estatus de flota" (ver EstatusFlotaDocument) y su
 * orden por default — quien configura el reporte (EstatusFlotaModal) puede
 * reordenarlas; el orden elegido viaja con la config del envío automático
 * (ConfigEstatusFlotaProgramado) para que el correo semanal respete el mismo
 * orden que se ve en pantalla.
 */
export type SeccionReporteId =
  | "indicadoresDashboard"
  | "resumen"
  | "disponibilidadGasto"
  | "flotaPorProyecto"
  | "proximosServicios"
  | "unidadesNoDisponibles"
  | "siniestros"
  | "apoyosComprasFinanzas"
  | "checklistsPendientes"
  | "checklistsRealizados"
  | "gpsSinReporte"
  | "gpsSinMovimiento"
  | "datosAdicionales";

export const SECCION_REPORTE_LABEL: Record<SeccionReporteId, string> = {
  indicadoresDashboard: "Indicadores del dashboard actual",
  resumen: "Resumen general (SLA, unidades, siniestros y presupuesto)",
  disponibilidadGasto: "Disponibilidad y gasto vs. presupuesto",
  flotaPorProyecto: "Flota por proyecto",
  proximosServicios: "Próximos servicios",
  unidadesNoDisponibles: "Unidades no disponibles (detalle)",
  siniestros: "Siniestros del periodo y acumulado anual",
  apoyosComprasFinanzas: "Apoyos de compras y finanzas",
  checklistsPendientes: "Checklists pendientes (unidades sin diario ni semanal)",
  checklistsRealizados: "Checklists realizados",
  gpsSinReporte: "Unidades sin reporte de GPS",
  gpsSinMovimiento: "Unidades sin movimiento GPS",
  datosAdicionales: "Datos adicionales",
};

export const ORDEN_SECCIONES_DEFAULT: SeccionReporteId[] = [
  "indicadoresDashboard",
  "resumen",
  "disponibilidadGasto",
  "flotaPorProyecto",
  "proximosServicios",
  "unidadesNoDisponibles",
  "siniestros",
  "apoyosComprasFinanzas",
  "checklistsPendientes",
  "checklistsRealizados",
  "gpsSinReporte",
  "gpsSinMovimiento",
  "datosAdicionales",
];

const SET_SECCIONES_VALIDAS = new Set<string>(ORDEN_SECCIONES_DEFAULT);

/**
 * Sanea un orden guardado/recibido de fuentes no confiables (JSON en BD,
 * input de un server action): descarta ids desconocidos y agrega al final,
 * en su posición default, cualquier sección válida que falte — así una
 * sección nueva agregada después nunca desaparece silenciosamente de un
 * reporte con un orden guardado viejo.
 */
export function sanearOrdenSecciones(orden: unknown): SeccionReporteId[] {
  const recibido = Array.isArray(orden) ? orden.filter((id): id is SeccionReporteId => typeof id === "string" && SET_SECCIONES_VALIDAS.has(id)) : [];
  const sinDuplicados = Array.from(new Set(recibido));
  const faltantes = ORDEN_SECCIONES_DEFAULT.filter((id) => !sinDuplicados.includes(id));
  return [...sinDuplicados, ...faltantes];
}

/** Secciones que quien configura el reporte deshabilitó — sanea igual que el orden (JSON de BD / input de server action). */
export function sanearSeccionesOcultas(ocultas: unknown): SeccionReporteId[] {
  return Array.isArray(ocultas) ? ORDEN_SECCIONES_DEFAULT.filter((id) => ocultas.includes(id)) : [];
}

/** Orden final a pintar: el orden guardado sin las secciones deshabilitadas. */
export function seccionesVisibles(orden: unknown, ocultas: unknown): SeccionReporteId[] {
  const fuera = sanearSeccionesOcultas(ocultas);
  return sanearOrdenSecciones(orden).filter((id) => !fuera.includes(id));
}
