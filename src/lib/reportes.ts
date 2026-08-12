export const TIPOS_REPORTE = [
  { value: "inventario", label: "Inventario de unidades" },
  { value: "mantenimiento", label: "Mantenimiento y gastos" },
  { value: "combustible", label: "Combustible" },
  { value: "seguros", label: "Seguros y vencimientos" },
  { value: "operadores", label: "Operadores y documentación" },
  { value: "ubicacion_nocturna", label: "Ubicación nocturna (plantilla predefinida)" },
] as const;

export const CAMPOS_POR_TIPO: Record<string, { key: string; label: string }[]> = {
  inventario: [
    { key: "numeroEconomico", label: "N° económico" },
    { key: "placas", label: "Placas" },
    { key: "proyecto", label: "Proyecto" },
    { key: "estatus", label: "Estatus" },
    { key: "kmOficial", label: "Km oficial" },
  ],
  mantenimiento: [
    { key: "categoria", label: "Categoría" },
    { key: "costo", label: "Costo" },
    { key: "estatus", label: "Estatus" },
    { key: "proveedor", label: "Proveedor" },
  ],
  combustible: [
    { key: "litros", label: "Litros" },
    { key: "costo", label: "Costo" },
    { key: "rendimiento", label: "Rendimiento" },
  ],
  seguros: [
    { key: "aseguradora", label: "Aseguradora" },
    { key: "vencimiento", label: "Vencimiento" },
    { key: "estatus", label: "Estatus" },
  ],
  operadores: [
    { key: "nombre", label: "Nombre" },
    { key: "proyecto", label: "Proyecto" },
    { key: "estatusDocumental", label: "Estatus documental" },
  ],
  ubicacion_nocturna: [
    { key: "numeroEconomico", label: "N° económico" },
    { key: "ultimaPosicion", label: "Última posición" },
    { key: "hora", label: "Hora de reporte" },
  ],
};

export const FRECUENCIA_LABEL: Record<string, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  MENSUAL: "Mensual",
};
