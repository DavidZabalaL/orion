// Registro de metadatos del motor de BI: cataloga qué columnas de qué
// tablas son "dimensiones" (eje X) y "métricas" (eje Y). El endpoint
// /api/bi/query solo puede leer columnas declaradas aquí — nunca acepta
// nombres de columna o tabla directamente del cliente.

export type TipoDimension = "texto" | "fecha_mes";
export type TipoMetrica = "conteo" | "suma" | "promedio";

export type DimensionMeta = {
  id: string;
  label: string;
  tipo: TipoDimension;
  /** Expresión SQL de la dimensión, ya resuelta contra los JOIN del dataset. */
  expr: string;
};

export type MetricaMeta = {
  id: string;
  label: string;
  tipo: TipoMetrica;
  /** Columna SQL sobre la que aplica la agregación (ignorada si tipo === "conteo"). */
  columna?: string;
};

export type DatasetMeta = {
  id: string;
  label: string;
  /** Tabla base + JOINs, ya armados como fragmento SQL fijo (sin input de usuario). */
  from: string;
  dimensiones: DimensionMeta[];
  metricas: MetricaMeta[];
};

export const BI_DATASETS: DatasetMeta[] = [
  {
    id: "unidades",
    label: "Inventario de unidades",
    from: `"Unidad" u LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    dimensiones: [
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `u."estatus"` },
      { id: "tipoVehiculo", label: "Tipo de vehículo", tipo: "texto", expr: `u."tipoVehiculo"` },
      { id: "tipoCombustible", label: "Tipo de combustible", tipo: "texto", expr: `u."tipoCombustible"` },
      { id: "marca", label: "Marca", tipo: "texto", expr: `u."marca"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
    ],
    metricas: [
      { id: "conteo", label: "N° de unidades", tipo: "conteo" },
      { id: "kmPromedio", label: "Km oficial promedio", tipo: "promedio", columna: `u."kmOficial"` },
      { id: "kmTotal", label: "Km oficial total", tipo: "suma", columna: `u."kmOficial"` },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento y gastos",
    from: `"GastoVehicular" g LEFT JOIN "Proyecto" p ON p.id = g."proyectoReportanteId"`,
    dimensiones: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `g."categoria"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `g."estatus"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `g."fecha"` },
    ],
    metricas: [
      { id: "conteo", label: "N° de gastos", tipo: "conteo" },
      { id: "costoTotal", label: "Costo total", tipo: "suma", columna: `g."costo"` },
      { id: "costoPromedio", label: "Costo promedio", tipo: "promedio", columna: `g."costo"` },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    from: `"Combustible" c LEFT JOIN "Proyecto" p ON p.id = c."proyectoReportanteId"`,
    dimensiones: [
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `c."fecha"` },
    ],
    metricas: [
      { id: "conteo", label: "N° de cargas", tipo: "conteo" },
      { id: "litrosTotal", label: "Litros totales", tipo: "suma", columna: `c."litros"` },
      { id: "costoTotal", label: "Costo total", tipo: "suma", columna: `c."costo"` },
      { id: "rendimientoPromedio", label: "Rendimiento promedio", tipo: "promedio", columna: `c."rendimientoCalculado"` },
    ],
  },
  {
    id: "seguros",
    label: "Seguros y vencimientos",
    from: `"Seguro" s`,
    dimensiones: [
      { id: "aseguradora", label: "Aseguradora", tipo: "texto", expr: `s."aseguradora"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `s."estatus"` },
      { id: "mesVencimiento", label: "Mes de vencimiento", tipo: "fecha_mes", expr: `s."fechaVencimiento"` },
    ],
    metricas: [
      { id: "conteo", label: "N° de pólizas", tipo: "conteo" },
      { id: "costoTotal", label: "Costo total", tipo: "suma", columna: `s."costo"` },
    ],
  },
];

export function obtenerDataset(id: string): DatasetMeta | undefined {
  return BI_DATASETS.find((d) => d.id === id);
}

export function obtenerDimension(dataset: DatasetMeta, id: string): DimensionMeta | undefined {
  return dataset.dimensiones.find((d) => d.id === id);
}

export function obtenerMetrica(dataset: DatasetMeta, id: string): MetricaMeta | undefined {
  return dataset.metricas.find((m) => m.id === id);
}

/** Combinaciones curadas de arranque (MVP), antes de abrir el selector libre. */
export const BI_COMBINACIONES_SUGERIDAS: { label: string; dataset: string; ejeX: string; ejeY: string; tipoGrafica: TipoGrafica }[] = [
  { label: "Unidades por estatus", dataset: "unidades", ejeX: "estatus", ejeY: "conteo", tipoGrafica: "barras" },
  { label: "Unidades por proyecto", dataset: "unidades", ejeX: "proyecto", ejeY: "conteo", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por categoría", dataset: "mantenimiento", ejeX: "categoria", ejeY: "costoTotal", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por mes", dataset: "mantenimiento", ejeX: "mes", ejeY: "costoTotal", tipoGrafica: "lineas" },
  { label: "Litros de combustible por mes", dataset: "combustible", ejeX: "mes", ejeY: "litrosTotal", tipoGrafica: "lineas" },
  { label: "Pólizas por aseguradora", dataset: "seguros", ejeX: "aseguradora", ejeY: "conteo", tipoGrafica: "pie" },
];

export type TipoGrafica = "barras" | "lineas" | "pie";

export type TamanoWidget = "sm" | "md" | "lg";

export const TAMANO_COLSPAN: Record<TamanoWidget, string> = {
  sm: "lg:col-span-1",
  md: "lg:col-span-2",
  lg: "lg:col-span-3",
};

export type WidgetDashboardBI = {
  id: string;
  label: string;
  dataset: string;
  ejeX: string;
  ejeY: string;
  tipoGrafica: TipoGrafica;
  tamano: TamanoWidget;
};

export const WIDGETS_BI_DEFAULT: WidgetDashboardBI[] = BI_COMBINACIONES_SUGERIDAS.map((c, i) => ({
  id: `default-${i}`,
  label: c.label,
  dataset: c.dataset,
  ejeX: c.ejeX,
  ejeY: c.ejeY,
  tipoGrafica: c.tipoGrafica,
  tamano: "sm",
}));
