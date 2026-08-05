// Especificación del Checklist Semanal de Vehículos — ver
// checklist_semanal_vehiculos_especificacion.md para el detalle original.
// "Tipo de Check List" (diario/semanal) no se modela como campo: en Orión se
// elige con el botón Diario/Semanal de la pantalla, no dentro del formulario.
// "Modelo" y "Tipo de Vehículo" tampoco son campos aquí: se derivan de la
// unidad seleccionada y se guardan igual dentro de las respuestas al enviar.

export type OpcionRadio = string;

export type CampoRadio = {
  tipo: "radio";
  key: string;
  label: string;
  opciones: OpcionRadio[];
  requerido: boolean;
  /** Foto asociada directamente a este campo (aparece justo debajo). */
  fotoKey?: string;
  fotoLabel?: string;
  fotoRequerido?: boolean;
  /** Si se define, el campo solo aplica a ese tipo de vehículo (ej. GRUA). */
  soloTipoVehiculo?: string;
};

export type CampoFoto = {
  tipo: "foto";
  key: string;
  label: string;
  requerido: boolean;
};

export type CampoNumero = {
  tipo: "numero";
  key: string;
  label: string;
  requerido: boolean;
  min?: number;
  max?: number;
};

export type CampoToggle = {
  tipo: "toggle";
  key: string;
  label: string;
  opciones: OpcionRadio[];
  requerido: boolean;
};

export type CampoTextarea = {
  tipo: "textarea";
  key: string;
  label: string;
  requerido: boolean;
};

export type CampoSemanal = CampoRadio | CampoFoto | CampoNumero | CampoToggle | CampoTextarea;

export type SeccionSemanal = {
  key: string;
  titulo: string;
  campos: CampoSemanal[];
};

const ESTADO_3 = ["MINIMO", "MEDIO", "MAXIMO"];
const ESTADO_4 = ["MINIMO", "MEDIO", "MAXIMO", "NO APLICA"];
const BUEN_MAL_NA = ["BUEN ESTADO", "MAL ESTADO", "N/A"];
const BUEN_MAL_NA2 = ["BUEN ESTADO", "MAL ESTADO", "NA"];

export const SECCIONES_CHECKLIST_SEMANAL: SeccionSemanal[] = [
  {
    key: "niveles",
    titulo: "Niveles",
    campos: [
      { tipo: "radio", key: "niv_nivel_aceite", label: "Nivel de aceite", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_aceite", fotoLabel: "Evidencia fotográfica (aceite)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_aceite_grua", label: "Nivel de aceite de grúa", opciones: ESTADO_3, requerido: false, fotoKey: "niv_evidencia_aceite_grua", fotoLabel: "Evidencia fotográfica nivel de aceite de grúa", fotoRequerido: false, soloTipoVehiculo: "GRUA" },
      { tipo: "radio", key: "niv_nivel_frenos", label: "Nivel de líquido de frenos", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_frenos", fotoLabel: "Evidencia fotográfica (frenos)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_direccion", label: "Nivel de líquido de dirección", opciones: ESTADO_4, requerido: true, fotoKey: "niv_evidencia_direccion", fotoLabel: "Evidencia fotográfica (dirección)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_anticongelante", label: "Nivel de líquido anticongelante", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_anticongelante", fotoLabel: "Evidencia fotográfica (anticongelante)", fotoRequerido: true },
    ],
  },
  {
    key: "exterior",
    titulo: "Exterior",
    campos: [
      { tipo: "foto", key: "ext_evidencia_frente", label: "Evidencia fotográfica del frente del vehículo", requerido: true },
      { tipo: "radio", key: "ext_parabrisas_delantero", label: "Parabrisas delantero", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_parabrisas_delantero", fotoLabel: "Evidencia fotográfica del parabrisas delantero", fotoRequerido: true },
      { tipo: "radio", key: "ext_espejos_laterales", label: "Espejos laterales", opciones: BUEN_MAL_NA, requerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_del_izq", label: "Evidencia fotográfica del faro delantero izquierdo", requerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_del_der", label: "Evidencia fotográfica del faro delantero derecho", requerido: true },
      { tipo: "radio", key: "ext_faros_neblineros", label: "Faros neblineros", opciones: BUEN_MAL_NA, requerido: true },
      { tipo: "radio", key: "ext_llanta_del_der", label: "Llanta delantera derecha", opciones: BUEN_MAL_NA, requerido: true },
      { tipo: "foto", key: "ext_evidencia_lateral_der", label: "Evidencia fotográfica del lateral derecho", requerido: true },
      { tipo: "radio", key: "ext_llanta_tras_der", label: "Llanta trasera derecha", opciones: BUEN_MAL_NA, requerido: true },
      { tipo: "foto", key: "ext_evidencia_trasera", label: "Evidencia fotográfica parte trasera del vehículo", requerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_tras_der", label: "Evidencia fotográfica del faro trasero derecho", requerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_tras_izq", label: "Evidencia fotográfica del faro trasero izquierdo", requerido: true },
      { tipo: "radio", key: "ext_parabrisas_posterior", label: "Parabrisas posterior", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_parabrisas_posterior", fotoLabel: "Evidencia fotográfica del parabrisas posterior", fotoRequerido: true },
      { tipo: "radio", key: "ext_llanta_refaccion", label: "¿Estado de la llanta de refacción?", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_llanta_refaccion", fotoLabel: "Evidencia fotográfica del estado de la llanta de refacción", fotoRequerido: false },
      { tipo: "radio", key: "ext_llanta_tras_izq", label: "Llanta trasera izquierda", opciones: BUEN_MAL_NA, requerido: true },
      { tipo: "foto", key: "ext_evidencia_lateral_izq", label: "Evidencia fotográfica del lateral izquierdo", requerido: true },
      { tipo: "radio", key: "ext_llanta_del_izq", label: "Llanta delantera izquierda", opciones: BUEN_MAL_NA, requerido: true },
    ],
  },
  {
    key: "interior",
    titulo: "Interior",
    campos: [
      { tipo: "radio", key: "int_orden_limpieza_cabina", label: "Orden y limpieza de cabina delantera", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_cabina", fotoLabel: "Evidencia fotográfica cabina delantera", fotoRequerido: true },
      { tipo: "radio", key: "int_espejo_retrovisor", label: "Espejo retrovisor", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_espejo_retrovisor", fotoLabel: "Evidencia fotográfica espejo retrovisor", fotoRequerido: false },
      { tipo: "radio", key: "int_estado_tablero", label: "Estado del tablero", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_tablero", fotoLabel: "Evidencia fotográfica del tablero", fotoRequerido: true },
      { tipo: "numero", key: "int_porcentaje_combustible", label: "Especifique el porcentaje del nivel de combustible", requerido: true, min: 0, max: 100 },
      { tipo: "foto", key: "int_evidencia_combustible", label: "Evidencia fotográfica del nivel de combustible", requerido: true },
      { tipo: "foto", key: "int_evidencia_tarjeta_circulacion", label: "Evidencia fotográfica tarjeta de circulación", requerido: true },
      { tipo: "toggle", key: "int_poliza_seguro", label: "Póliza de seguro", opciones: ["NA", "N", "Y"], requerido: false },
      { tipo: "radio", key: "int_freno_mano", label: "Freno de mano", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_claxon", label: "Claxón", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_cortas", label: "Luces cortas", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_largas", label: "Luces largas", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_direccionales", label: "Luces direccionales", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luz_stop", label: "Luz de stop", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_intermitentes", label: "Intermitentes", opciones: BUEN_MAL_NA, requerido: false },
    ],
  },
  {
    key: "herramientas",
    titulo: "Herramientas",
    campos: [
      { tipo: "radio", key: "her_gato", label: "Gato", opciones: BUEN_MAL_NA2, requerido: true },
      { tipo: "radio", key: "her_palanca_ruedas", label: "Herramientas de palanca de ruedas", opciones: BUEN_MAL_NA2, requerido: true },
      { tipo: "foto", key: "her_evidencia_herramientas", label: "Evidencia fotográfica de herramientas", requerido: true },
      { tipo: "textarea", key: "her_observaciones", label: "Observación de irregularidades", requerido: false },
    ],
  },
];

/** Todas las claves de campo tipo foto (radio.fotoKey + foto sueltas) — útil para validar/leer el FormData completo. */
export function todasLasClavesFoto(): string[] {
  const claves: string[] = [];
  for (const seccion of SECCIONES_CHECKLIST_SEMANAL) {
    for (const campo of seccion.campos) {
      if (campo.tipo === "foto") claves.push(campo.key);
      if (campo.tipo === "radio" && campo.fotoKey) claves.push(campo.fotoKey);
    }
  }
  return claves;
}
