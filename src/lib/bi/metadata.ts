// Registro de metadatos del motor de BI: cataloga qué columnas de qué
// tablas están disponibles por dataset. El endpoint /api/bi/query solo
// puede leer columnas declaradas aquí — nunca acepta nombres de columna
// o tabla directamente del cliente.
//
// Eje X y eje Y comparten el mismo catálogo de "campos" (misma lista para
// ambos selectores): el eje X siempre agrupa por el campo elegido; el eje Y
// además elige una agregación (conteo / suma / promedio) — suma y promedio
// solo aplican a campos numéricos.

export type TipoCampo = "texto" | "fecha_mes" | "numero";
export type TipoAgregacion = "conteo" | "suma" | "promedio";
export type TipoGrafica = "barras" | "lineas" | "pie";

export type CampoMeta = {
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Expresión SQL del campo, ya resuelta contra los JOIN del dataset. */
  expr: string;
};

export type DatasetMeta = {
  id: string;
  label: string;
  /** Tabla base + JOINs, ya armados como fragmento SQL fijo (sin input de usuario). */
  from: string;
  campos: CampoMeta[];
};

export const BI_DATASETS: DatasetMeta[] = [
  {
    id: "unidades",
    label: "Inventario de unidades",
    from: `"Unidad" u LEFT JOIN "Proyecto" p ON p.id = u."proyectoId"`,
    campos: [
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `u."estatus"` },
      { id: "tipoVehiculo", label: "Tipo de vehículo", tipo: "texto", expr: `u."tipoVehiculo"` },
      { id: "tipoCombustible", label: "Tipo de combustible", tipo: "texto", expr: `u."tipoCombustible"` },
      { id: "marca", label: "Marca", tipo: "texto", expr: `u."marca"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "kmOficial", label: "Km oficial", tipo: "numero", expr: `u."kmOficial"` },
    ],
  },
  {
    id: "mantenimiento",
    label: "Mantenimiento y gastos",
    from: `"GastoVehicular" g LEFT JOIN "Proyecto" p ON p.id = g."proyectoReportanteId"`,
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `g."categoria"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `g."estatus"` },
      { id: "proveedor", label: "Proveedor", tipo: "texto", expr: `COALESCE(g."proveedor", 'Sin proveedor')` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `g."fecha"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `g."costo"` },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    from: `"Combustible" c LEFT JOIN "Proyecto" p ON p.id = c."proyectoReportanteId"`,
    campos: [
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `c."fecha"` },
      { id: "litros", label: "Litros", tipo: "numero", expr: `c."litros"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `c."costo"` },
      { id: "rendimientoCalculado", label: "Rendimiento", tipo: "numero", expr: `c."rendimientoCalculado"` },
    ],
  },
  {
    id: "seguros",
    label: "Seguros y vencimientos",
    from: `"Seguro" s`,
    campos: [
      { id: "aseguradora", label: "Aseguradora", tipo: "texto", expr: `s."aseguradora"` },
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `s."estatus"` },
      { id: "mesVencimiento", label: "Mes de vencimiento", tipo: "fecha_mes", expr: `s."fechaVencimiento"` },
      { id: "costo", label: "Costo", tipo: "numero", expr: `s."costo"` },
    ],
  },
  {
    id: "operadores",
    label: "Operadores",
    from: `"Operador" o LEFT JOIN "Proyecto" p ON p.id = o."proyectoId"`,
    campos: [
      { id: "estatus", label: "Estatus", tipo: "texto", expr: `o."estatus"` },
      { id: "estatusDocumental", label: "Estatus documental", tipo: "texto", expr: `o."estatusDocumental"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesAlta", label: "Mes de alta", tipo: "fecha_mes", expr: `o."createdAt"` },
    ],
  },
  {
    id: "documentos_operador",
    label: "Documentos de operadores",
    from: `"DocumentoOperador" do2 LEFT JOIN "Operador" o ON o.id = do2."operadorId" LEFT JOIN "Proyecto" p ON p.id = o."proyectoId"`,
    campos: [
      { id: "tipoDocumento", label: "Tipo de documento", tipo: "texto", expr: `do2."tipoDocumento"` },
      { id: "tipoLicencia", label: "Tipo de licencia", tipo: "texto", expr: `COALESCE(do2."tipoLicencia"::text, 'N/A')` },
      { id: "verificado", label: "Verificación", tipo: "texto", expr: `CASE WHEN do2."verificado" THEN 'Verificado' ELSE 'Pendiente' END` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mesVencimiento", label: "Mes de vencimiento", tipo: "fecha_mes", expr: `do2."fechaVencimiento"` },
    ],
  },
  {
    id: "peajes",
    label: "TAG / Peajes",
    from: `"Tag" t LEFT JOIN "Proyecto" p ON p.id = t."proyectoReportanteId"`,
    campos: [
      { id: "proveedorTag", label: "Proveedor de TAG", tipo: "texto", expr: `t."proveedorTag"` },
      { id: "conciliado", label: "Conciliación", tipo: "texto", expr: `CASE WHEN t."conciliado" THEN 'Conciliado' ELSE 'Pendiente' END` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `t."fecha"` },
      { id: "monto", label: "Monto", tipo: "numero", expr: `t."monto"` },
    ],
  },
  {
    id: "presupuesto_partida",
    label: "Presupuesto por partida (autorizado)",
    from: `"PresupuestoPartida" pp LEFT JOIN "Proyecto" p ON p.id = pp."proyectoId"`,
    campos: [
      { id: "categoria", label: "Categoría de gasto", tipo: "texto", expr: `pp."categoria"` },
      { id: "proyecto", label: "Proyecto", tipo: "texto", expr: `COALESCE(p."nombre", 'Sin proyecto')` },
      { id: "mes", label: "Mes", tipo: "fecha_mes", expr: `make_date(pp."anio", pp."mes", 1)` },
      { id: "montoPresupuestado", label: "Monto presupuestado", tipo: "numero", expr: `pp."montoPresupuestado"` },
    ],
  },
];

export function obtenerDataset(id: string): DatasetMeta | undefined {
  return BI_DATASETS.find((d) => d.id === id);
}

export function obtenerCampo(dataset: DatasetMeta, id: string): CampoMeta | undefined {
  return dataset.campos.find((c) => c.id === id);
}

/** Agregaciones permitidas para un campo: conteo siempre; suma/promedio solo en campos numéricos. */
export function agregacionesDisponibles(campo: CampoMeta): TipoAgregacion[] {
  return campo.tipo === "numero" ? ["conteo", "suma", "promedio"] : ["conteo"];
}

export const AGREGACION_LABEL: Record<TipoAgregacion, string> = {
  conteo: "Conteo",
  suma: "Suma",
  promedio: "Promedio",
};

/** Combinaciones curadas de arranque (MVP), antes de abrir el selector libre. */
export const BI_COMBINACIONES_SUGERIDAS: { label: string; dataset: string; ejeX: string; ejeY: string; agregacion: TipoAgregacion; tipoGrafica: TipoGrafica }[] = [
  { label: "Unidades por estatus", dataset: "unidades", ejeX: "estatus", ejeY: "estatus", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Unidades por proyecto", dataset: "unidades", ejeX: "proyecto", ejeY: "proyecto", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por categoría", dataset: "mantenimiento", ejeX: "categoria", ejeY: "costo", agregacion: "suma", tipoGrafica: "barras" },
  { label: "Gasto de mantenimiento por mes", dataset: "mantenimiento", ejeX: "mes", ejeY: "costo", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Litros de combustible por mes", dataset: "combustible", ejeX: "mes", ejeY: "litros", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Pólizas por aseguradora", dataset: "seguros", ejeX: "aseguradora", ejeY: "aseguradora", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Operadores por estatus documental", dataset: "operadores", ejeX: "estatusDocumental", ejeY: "estatusDocumental", agregacion: "conteo", tipoGrafica: "pie" },
  { label: "Documentos por vencer por tipo", dataset: "documentos_operador", ejeX: "tipoDocumento", ejeY: "tipoDocumento", agregacion: "conteo", tipoGrafica: "barras" },
  { label: "Gasto de peajes por mes", dataset: "peajes", ejeX: "mes", ejeY: "monto", agregacion: "suma", tipoGrafica: "lineas" },
  { label: "Presupuesto autorizado por categoría", dataset: "presupuesto_partida", ejeX: "categoria", ejeY: "montoPresupuestado", agregacion: "suma", tipoGrafica: "barras" },
];

/** Posición/tamaño en la cuadrícula de arrastre (react-grid-layout), en unidades de columna/fila. */
export type LayoutWidget = { x: number; y: number; w: number; h: number };

export type WidgetDashboardBI = {
  id: string;
  label: string;
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  layout: LayoutWidget;
};

const ANCHO_DEFAULT = [4, 4, 6, 6, 6, 4]; // en una cuadrícula de 12 columnas
const ALTO_DEFAULT = 9;
const COLS_DEFAULT = 12;

export const WIDGETS_BI_DEFAULT: WidgetDashboardBI[] = BI_COMBINACIONES_SUGERIDAS.map((c, i) => {
  const w = ANCHO_DEFAULT[i % ANCHO_DEFAULT.length];
  const porFila = Math.floor(COLS_DEFAULT / w) || 1;
  const fila = Math.floor(i / porFila);
  const col = (i % porFila) * w;
  return {
    id: `default-${i}`,
    label: c.label,
    dataset: c.dataset,
    ejeX: c.ejeX,
    ejeY: c.ejeY,
    agregacion: c.agregacion,
    tipoGrafica: c.tipoGrafica,
    layout: { x: col, y: fila * ALTO_DEFAULT, w, h: ALTO_DEFAULT },
  };
});
