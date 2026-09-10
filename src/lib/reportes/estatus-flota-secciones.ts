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
  | "datosAdicionales";

export const SECCION_REPORTE_LABEL: Record<SeccionReporteId, string> = {
  indicadoresDashboard: "Indicadores del dashboard actual",
  resumen: "SLA, unidades y checklists",
  disponibilidadGasto: "Disponibilidad y gasto vs. presupuesto",
  flotaPorProyecto: "Flota por proyecto",
  proximosServicios: "Próximos servicios",
  unidadesNoDisponibles: "Unidades no disponibles (detalle)",
  datosAdicionales: "Datos adicionales",
};

export const ORDEN_SECCIONES_DEFAULT: SeccionReporteId[] = [
  "indicadoresDashboard",
  "resumen",
  "disponibilidadGasto",
  "flotaPorProyecto",
  "proximosServicios",
  "unidadesNoDisponibles",
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
