export const CAMPOS_TAG = [
  { key: "fecha", label: "Fecha", requerido: true },
  { key: "monto", label: "Monto", requerido: true },
  { key: "caseta", label: "Caseta", requerido: false },
  { key: "numeroEconomico", label: "N° económico (si viene en el archivo)", requerido: false },
] as const;

export type CampoTagKey = (typeof CAMPOS_TAG)[number]["key"];

const DDMMYYYY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

export function parsearFechaFlexible(valor: string): Date | null {
  const limpio = valor.trim();
  if (!limpio) return null;

  const coincidencia = limpio.match(DDMMYYYY);
  if (coincidencia) {
    const [, dia, mes, anio] = coincidencia;
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(limpio);
  return isNaN(fecha.getTime()) ? null : fecha;
}
