// Tipos y heurística de "campos extra" del reporte de Estatus de flota — sin
// dependencias de servidor (Prisma), para poder usarse tanto en el modal
// (cliente) como en el cálculo real del reporte (servidor).
//
// La idea: el usuario elige cualquier campo del mismo catálogo de "etiquetas"
// que ya usa el Explorador BI (src/lib/bi/metadata.ts) para agregar al
// reporte, y el sistema sugiere solo cómo mostrarlo según su tipo de dato —
// no hace falta que el usuario elija tipo de gráfica:
//   - numero            → un KPI (suma total del periodo/alcance)
//   - texto/geografico  → barras (conteo agrupado por ese valor)
//   - fecha_mes/fecha_dia → barras (conteo por periodo)
import type { TipoCampo } from "@/lib/bi/metadata";
import type { ReglaColorColumna } from "@/lib/bi/reglas-color";

export type TipoVisualizacionExtra = "kpi" | "barras";

export const VISUALIZACION_SUGERIDA: Record<TipoCampo, TipoVisualizacionExtra> = {
  numero: "kpi",
  texto: "barras",
  geografico: "barras",
  fecha_mes: "barras",
  fecha_dia: "barras",
};

export const VISUALIZACION_SUGERIDA_LABEL: Record<TipoVisualizacionExtra, string> = {
  kpi: "Dato numérico (KPI)",
  barras: "Gráfica de barras",
};

/**
 * Agrupación temporal opcional para un campo numérico (KPI) — en vez de un
 * solo total del periodo, lo desglosa en una barra por mes/trimestre/
 * semestre/año dentro de ese mismo periodo. Solo aplica a datasets con
 * `fechaActividadExpr` (periodoAcotado=true) — un dataset de snapshot
 * (unidades, seguros) no tiene una fecha de evento por la cual agrupar.
 */
export type AgrupacionTemporal = "mes" | "trimestre" | "semestre" | "anio";

export const AGRUPACION_TEMPORAL_LABEL: Record<AgrupacionTemporal, string> = {
  mes: "Por mes",
  trimestre: "Por trimestre",
  semestre: "Por semestre",
  anio: "Por año",
};

export type CampoExtraSeleccionado = {
  datasetId: string;
  campoId: string;
  /** Solo tiene efecto sobre campos numéricos de un dataset con periodo acotado — ver AgrupacionTemporal. */
  agrupacionTemporal?: AgrupacionTemporal;
  /** Semáforo condicional sobre el valor de este dato — ver src/lib/bi/reglas-color.ts. */
  reglasColor?: ReglaColorColumna[];
  /** Solo tiene efecto en datasets con periodo acotado: además del dato del periodo del reporte, calcula el mismo dato acumulado desde el 1 de enero del año de `hasta` — ver CampoExtraResultado.acumuladoAnio. */
  mostrarAcumuladoAnio?: boolean;
};

export type CampoExtraResultado = {
  datasetId: string;
  campoId: string;
  datasetLabel: string;
  campoLabel: string;
  tipoVisualizacion: TipoVisualizacionExtra;
  /** true si el dataset de este campo tiene una fecha de actividad propia
   *  (ver DatasetMeta.fechaActividadExpr) y por lo tanto `valorKpi`/`filas`
   *  están acotados al mismo periodo [desde, hasta] que el resto del
   *  reporte; false si el dataset es de estado/snapshot (ej. unidades,
   *  seguros) y el valor es histórico completo, sin acotar. */
  periodoAcotado: boolean;
  /** Presente cuando se pidió desglosar un campo numérico por periodo — en
   *  ese caso `tipoVisualizacion` pasa a "barras" (una barra por periodo) y
   *  el dato ya no viene en `valorKpi` sino en `filas`, igual que un campo de
   *  categoría. */
  agrupacionTemporal?: AgrupacionTemporal;
  /** Semáforo condicional sobre el valor de este dato, ecoado desde la selección — ver src/lib/bi/reglas-color.ts. */
  reglasColor?: ReglaColorColumna[];
  /** Solo si tipoVisualizacion="kpi": suma total en el alcance de proyectos del reporte (acotada al periodo si `periodoAcotado`, histórica si no). */
  valorKpi?: number;
  /** Solo si tipoVisualizacion="barras": conteo/suma agrupado, ya limitado a un máximo de filas para el PDF. Si `agrupacionTemporal` está presente, viene ordenado cronológicamente en vez de por valor descendente. */
  filas?: { label: string; valor: number }[];
  /** Presente solo si se pidió `mostrarAcumuladoAnio` y el dataset tiene periodo acotado — mismo dato (valorKpi o filas, nunca agrupado por `agrupacionTemporal`) calculado sobre [1 enero de `anio`, hasta] en vez de [desde, hasta]. */
  acumuladoAnio?: { anio: number; valorKpi?: number; filas?: { label: string; valor: number }[] };
};
