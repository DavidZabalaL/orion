// Catálogo y helpers de las 6 posiciones de llanta (ver PosicionLlanta en
// prisma/schema.prisma) — compartido entre el formulario de gasto (categoría
// LLANTAS), la pestaña "Llantas" de la ficha de unidad y cualquier reporte.
export const POSICION_LLANTA_LABEL: Record<string, string> = {
  DELANTERA_IZQUIERDA: "Delantera izquierda",
  DELANTERA_DERECHA: "Delantera derecha",
  TRASERA_IZQUIERDA_EXTERIOR: "Trasera izquierda exterior",
  TRASERA_IZQUIERDA_INTERIOR: "Trasera izquierda interior",
  TRASERA_DERECHA_EXTERIOR: "Trasera derecha exterior",
  TRASERA_DERECHA_INTERIOR: "Trasera derecha interior",
};

export const POSICIONES_LLANTA = Object.keys(POSICION_LLANTA_LABEL) as (keyof typeof POSICION_LLANTA_LABEL)[];

/** Solo existen en unidades con doble rodado trasero (Unidad.dobleRodadoTrasero) — en el resto, "no aplica". */
export const POSICIONES_LLANTA_INTERIORES = new Set(["TRASERA_IZQUIERDA_INTERIOR", "TRASERA_DERECHA_INTERIOR"]);

export function posicionLlantaAplica(posicion: string, dobleRodadoTrasero: boolean): boolean {
  return dobleRodadoTrasero || !POSICIONES_LLANTA_INTERIORES.has(posicion);
}
