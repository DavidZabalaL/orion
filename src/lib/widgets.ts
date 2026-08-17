import type { LayoutWidget } from "@/lib/bi/metadata";

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

// Cuadrícula de 12 columnas — mismo esquema que el dashboard de BI
// (react-grid-layout), para que arrastrar/redimensionar se sienta igual en
// toda la plataforma. Los "contador" son angostos por default (4 por fila);
// los "desglose" (con chips que pueden envolver) empiezan más anchos.
export const COLS_WIDGETS = 12;
const ANCHO_DEFAULT: Record<DefinicionWidget["tipo"], number> = { contador: 3, desglose: 6 };
const ALTO_DEFAULT: Record<DefinicionWidget["tipo"], number> = { contador: 4, desglose: 6 };

export function generarLayoutsPorDefecto(catalogo: DefinicionWidget[]): Record<string, LayoutWidget> {
  const layouts: Record<string, LayoutWidget> = {};
  let x = 0;
  let y = 0;
  let altoFila = 0;
  for (const w of catalogo) {
    const ancho = ANCHO_DEFAULT[w.tipo];
    const alto = ALTO_DEFAULT[w.tipo];
    if (x + ancho > COLS_WIDGETS) {
      x = 0;
      y += altoFila;
      altoFila = 0;
    }
    layouts[w.id] = { x, y, w: ancho, h: alto };
    x += ancho;
    altoFila = Math.max(altoFila, alto);
  }
  return layouts;
}

export function esLayoutValido(valor: unknown): valor is LayoutWidget {
  if (!valor || typeof valor !== "object") return false;
  const v = valor as Record<string, unknown>;
  return typeof v.x === "number" && typeof v.y === "number" && typeof v.w === "number" && typeof v.h === "number";
}

export type WidgetConfigItem = { id: string; activo: boolean; layout: LayoutWidget };

/** Forma que consumen las páginas al renderizar: incluye la etiqueta fija del catálogo (no editable) y el tipo (para saber si es "contador" o "desglose"). */
export type WidgetActivo = WidgetConfigItem & { label: string; tipo: DefinicionWidget["tipo"] };
