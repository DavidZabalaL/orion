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

export type CampoExtraSeleccionado = { datasetId: string; campoId: string };

export type CampoExtraResultado = {
  datasetId: string;
  campoId: string;
  datasetLabel: string;
  campoLabel: string;
  tipoVisualizacion: TipoVisualizacionExtra;
  /** Solo si tipoVisualizacion="kpi": suma total en el alcance de proyectos del reporte (histórico, no acotado al periodo). */
  valorKpi?: number;
  /** Solo si tipoVisualizacion="barras": conteo agrupado, ya limitado a un máximo de filas para el PDF. */
  filas?: { label: string; valor: number }[];
};
