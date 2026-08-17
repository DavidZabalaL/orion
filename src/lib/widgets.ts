export type DatosWidgetsUnidades = {
  total: number;
  activas: number;
  disponibles: number;
  noDisponibles: number;
  bajas: number;
  consignacionODireccion: number;
  gastoHoy: number;
  porTipo: { label: string; value: number }[];
  porTipoNoDisponible: { label: string; value: number }[];
  porProyecto: { label: string; value: number }[];
};

export type DefinicionWidget = {
  id: string;
  labelDefault: string;
  tipo: "contador" | "desglose";
};

export const CATALOGO_WIDGETS_UNIDADES: DefinicionWidget[] = [
  { id: "total", labelDefault: "Unidades totales", tipo: "contador" },
  { id: "activas", labelDefault: "Activas / disponibles", tipo: "contador" },
  { id: "disponibles", labelDefault: "Disponibles hoy", tipo: "contador" },
  { id: "noDisponibles", labelDefault: "No disponibles hoy", tipo: "contador" },
  { id: "bajas", labelDefault: "Bajas", tipo: "contador" },
  { id: "consignacionODireccion", labelDefault: "En consignación / dirección", tipo: "contador" },
  { id: "gastoHoy", labelDefault: "Gasto al día (hoy)", tipo: "contador" },
  { id: "porTipo", labelDefault: "Unidades por tipo de vehículo", tipo: "desglose" },
  { id: "porTipoNoDisponible", labelDefault: "No disponibles por tipo de vehículo", tipo: "desglose" },
  { id: "porProyecto", labelDefault: "Unidades por proyecto", tipo: "desglose" },
];

export const WIDGETS_DEFAULT_UNIDADES = ["total", "activas", "disponibles", "noDisponibles", "bajas", "consignacionODireccion", "porTipo", "porTipoNoDisponible", "porProyecto"];

export function valorWidgetUnidades(id: string, datos: DatosWidgetsUnidades): number | { label: string; value: number }[] {
  switch (id) {
    case "total": return datos.total;
    case "activas": return datos.activas;
    case "disponibles": return datos.disponibles;
    case "noDisponibles": return datos.noDisponibles;
    case "bajas": return datos.bajas;
    case "consignacionODireccion": return datos.consignacionODireccion;
    case "gastoHoy": return datos.gastoHoy;
    case "porTipo": return datos.porTipo;
    case "porTipoNoDisponible": return datos.porTipoNoDisponible;
    case "porProyecto": return datos.porProyecto;
    default: return 0;
  }
}

export type TamanoWidget = "pequeno" | "mediano" | "grande";

export const TAMANO_WIDGET_LABEL: Record<TamanoWidget, string> = {
  pequeno: "Pequeño",
  mediano: "Mediano",
  grande: "Grande (ancho completo)",
};

// Clases de grid-column para un contenedor `grid-cols-2 md:grid-cols-4`.
export const TAMANO_WIDGET_CLASE: Record<TamanoWidget, string> = {
  pequeno: "col-span-1",
  mediano: "col-span-2",
  grande: "col-span-2 md:col-span-4",
};

export function tamanoWidgetPorDefecto(tipo: "contador" | "desglose"): TamanoWidget {
  return tipo === "desglose" ? "mediano" : "pequeno";
}

export function esTamanoWidgetValido(valor: unknown): valor is TamanoWidget {
  return valor === "pequeno" || valor === "mediano" || valor === "grande";
}

export type WidgetConfigItem = { id: string; activo: boolean; tamano: TamanoWidget };

/** Forma que consumen las páginas al renderizar: incluye la etiqueta fija del catálogo (no editable). */
export type WidgetActivo = WidgetConfigItem & { label: string };
