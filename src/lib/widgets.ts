export type DatosWidgetsUnidades = {
  total: number;
  activas: number;
  disponibles: number;
  bajas: number;
  consignacionODireccion: number;
  gastoHoy: number;
  porTipo: { label: string; value: number }[];
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
  { id: "bajas", labelDefault: "Bajas", tipo: "contador" },
  { id: "consignacionODireccion", labelDefault: "En consignación / dirección", tipo: "contador" },
  { id: "gastoHoy", labelDefault: "Gasto al día (hoy)", tipo: "contador" },
  { id: "porTipo", labelDefault: "Unidades por tipo de vehículo", tipo: "desglose" },
  { id: "porProyecto", labelDefault: "Unidades por proyecto", tipo: "desglose" },
];

export const WIDGETS_DEFAULT_UNIDADES = ["total", "activas", "bajas", "consignacionODireccion"];

export function valorWidgetUnidades(id: string, datos: DatosWidgetsUnidades): number | { label: string; value: number }[] {
  switch (id) {
    case "total": return datos.total;
    case "activas": return datos.activas;
    case "disponibles": return datos.disponibles;
    case "bajas": return datos.bajas;
    case "consignacionODireccion": return datos.consignacionODireccion;
    case "gastoHoy": return datos.gastoHoy;
    case "porTipo": return datos.porTipo;
    case "porProyecto": return datos.porProyecto;
    default: return 0;
  }
}

export type WidgetConfigItem = { id: string; label: string; activo: boolean };
