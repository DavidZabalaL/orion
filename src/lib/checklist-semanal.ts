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
// Vida útil restante del dibujo de la llanta, en vez de un binario bien/mal —
// deja ver el desgaste real y anticipar el reemplazo antes de que sea crítico.
export const ESTADO_LLANTA = ["100% (NUEVA)", "75%", "50%", "25%", "0% (REEMPLAZAR)", "N/A"];

// Valores de respuesta que cuentan como "alerta" en los resúmenes del
// checklist semanal (badge de "N alertas" en la lista y en la ficha de la
// unidad, y filtros de /checklist e /checklist/historial) — "MAL ESTADO"/
// "MINIMO" para los campos binarios/de nivel, las llantas por debajo de 50%
// de vida útil, y "NA" para gato/palanca de ruedas/triángulo reflejante
// (BUEN_MAL_NA2): para ese equipo de seguridad "no aplica" significa que la
// unidad no cuenta con él, tan relevante como que esté en mal estado. No se
// incluye "N/A" (BUEN_MAL_NA, ~25 campos cosméticos/de equipamiento variado
// como antena, faros neblineros, espejos) ni "NO APLICA" (ESTADO_4) porque
// ahí "no aplica" suele ser una configuración normal del vehículo, no un
// hallazgo — generalizar la alerta a esos campos generaría ruido constante.
export const VALORES_ALERTA_SEMANAL = new Set(["MAL ESTADO", "MINIMO", "25%", "0% (REEMPLAZAR)", "NA"]);

// Clasificación de cada campo alertable en "operativa" (afecta la seguridad o
// el funcionamiento mecánico del vehículo: niveles, frenos, llantas, luces,
// cinturones, herramientas de seguridad) o "estética" (condición física o de
// limpieza sin impacto mecánico directo: espejos, parabrisas, antena, orden
// de cabina, tablero, papel de verificación). Sirve para separar el conteo
// de alertas en el resumen del checklist semanal.
export const CATEGORIA_ALERTA_SEMANAL: Record<string, "operativa" | "estetica"> = {
  // Niveles — todos operativos (fluidos/batería inciden directo en el funcionamiento).
  niv_nivel_aceite: "operativa",
  niv_nivel_aceite_grua: "operativa",
  niv_nivel_frenos: "operativa",
  niv_nivel_direccion: "operativa",
  niv_nivel_anticongelante: "operativa",
  niv_liquido_transmision: "operativa",
  int_bateria: "operativa",
  // Exterior
  ext_parabrisas_delantero: "estetica",
  ext_espejos_laterales: "estetica",
  ext_espejo_lateral_der: "estetica",
  ext_faros_neblineros: "operativa",
  ext_llanta_del_der: "operativa",
  ext_llanta_tras_der: "operativa",
  ext_llanta_tras_der_interior: "operativa",
  ext_parabrisas_posterior: "estetica",
  ext_faros_traseros: "operativa",
  ext_calavera_derecha: "operativa",
  ext_llanta_refaccion: "operativa",
  ext_llanta_tras_izq: "operativa",
  ext_llanta_del_izq: "operativa",
  ext_llanta_tras_izq_interior: "operativa",
  ext_antena: "estetica",
  // Interior
  int_orden_limpieza_cabina: "estetica",
  int_espejo_retrovisor: "estetica",
  int_estado_tablero: "estetica",
  int_volante: "estetica",
  int_papel_verificacion: "estetica",
  int_poliza_seguro: "operativa",
  int_freno_mano: "operativa",
  int_claxon: "operativa",
  int_luces_cortas: "operativa",
  int_luces_largas: "operativa",
  int_luces_direccionales: "operativa",
  int_luz_stop: "operativa",
  int_intermitentes: "operativa",
  int_cinturones_seguridad: "operativa",
  int_cinturon_copiloto: "operativa",
  int_cinturones_traseros: "operativa",
  int_ventanillas: "operativa",
  int_ventanilla_copiloto: "operativa",
  int_ventanilla_tras_der: "operativa",
  int_ventanilla_tras_izq: "operativa",
  // Herramientas — equipo de seguridad.
  her_gato: "operativa",
  her_palanca_ruedas: "operativa",
  her_triangulo_reflejante: "operativa",
  // Claves de versiones anteriores del formulario, ya no están en
  // SECCIONES_CHECKLIST_SEMANAL pero siguen presentes en respuestasSemanal
  // de checklists viejos — se mantienen clasificadas para no perderlas del conteo.
  niv_bayoneta_aceite: "operativa",
  ext_llantas_general: "operativa",
};

// Etiquetas para el detalle de alertas — de SECCIONES_CHECKLIST_SEMANAL más
// las claves de versiones anteriores del formulario (ya no están en el
// catálogo actual, ver CATEGORIA_ALERTA_SEMANAL más arriba).
const ETIQUETA_CAMPO_SEMANAL: Record<string, string> = {
  niv_bayoneta_aceite: "Estado de la Bayoneta",
  ext_llantas_general: "Llantas (general)",
};

export type AlertaSemanalDetalle = { key: string; label: string; valor: string; categoria: "operativa" | "estetica" };

/**
 * Lista las alertas de un checklist semanal (campo, valor y categoría) —
 * mismo criterio que VALORES_ALERTA_SEMANAL (valor en mal estado). Un campo
 * alertable sin clasificación explícita se cuenta como operativa (más
 * conservador: mejor que se revise de más a que se pierda una alerta).
 */
export function listarAlertasSemanal(respuestas: Record<string, string>): AlertaSemanalDetalle[] {
  const clavesFoto = new Set(todasLasClavesFoto());
  const alertas: AlertaSemanalDetalle[] = [];
  for (const [key, valor] of Object.entries(respuestas)) {
    if (clavesFoto.has(key) || !VALORES_ALERTA_SEMANAL.has(valor)) continue;
    alertas.push({
      key,
      label: ETIQUETA_CAMPO_SEMANAL[key] ?? key,
      valor,
      categoria: CATEGORIA_ALERTA_SEMANAL[key] === "estetica" ? "estetica" : "operativa",
    });
  }
  return alertas;
}

/**
 * Cuenta las alertas de un checklist semanal separadas por categoría —
 * agrupado para mostrar p. ej. "10 estéticas, 8 operativas" en los resúmenes.
 */
export function contarAlertasPorCategoria(respuestas: Record<string, string>): {
  operativas: number;
  esteticas: number;
} {
  const alertas = listarAlertasSemanal(respuestas);
  return {
    operativas: alertas.filter((a) => a.categoria === "operativa").length,
    esteticas: alertas.filter((a) => a.categoria === "estetica").length,
  };
}

// Variantes de "no aplica" usadas entre los distintos conjuntos de opciones
// de este checklist (BUEN_MAL_NA usa "N/A", BUEN_MAL_NA2 usa "NA", ESTADO_4
// usa "NO APLICA") — cuando el operador responde con cualquiera de estas, no
// tiene sentido pedirle evidencia fotográfica de algo que no existe en la unidad.
const ES_NO_APLICA = new Set(["N/A", "NA", "NO APLICA"]);
export function esNoAplica(valor: string | undefined | null): boolean {
  return !!valor && ES_NO_APLICA.has(valor.toUpperCase());
}

export const SECCIONES_CHECKLIST_SEMANAL: SeccionSemanal[] = [
  {
    key: "niveles",
    titulo: "Niveles",
    campos: [
      { tipo: "radio", key: "niv_nivel_aceite", label: "Nivel de aceite", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_aceite", fotoLabel: "Evidencia fotográfica (aceite)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_aceite_grua", label: "Nivel de aceite de grúa", opciones: ESTADO_3, requerido: false, fotoKey: "niv_evidencia_aceite_grua", fotoLabel: "Evidencia fotográfica nivel de aceite de grúa", fotoRequerido: false, soloTipoVehiculo: "GRUA" },
      { tipo: "radio", key: "niv_bayoneta_aceite", label: "Estado de la Bayoneta", opciones: ["BUENO", "REGULAR", "MALO"], requerido: true, fotoKey: "niv_evidencia_bayoneta", fotoLabel: "Evidencia fotográfica (bayoneta)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_frenos", label: "Nivel de líquido de frenos", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_frenos", fotoLabel: "Evidencia fotográfica (frenos)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_direccion", label: "Nivel de líquido de dirección", opciones: ESTADO_4, requerido: true, fotoKey: "niv_evidencia_direccion", fotoLabel: "Evidencia fotográfica (dirección)", fotoRequerido: true },
      { tipo: "radio", key: "niv_nivel_anticongelante", label: "Nivel de líquido anticongelante", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_anticongelante", fotoLabel: "Evidencia fotográfica (anticongelante)", fotoRequerido: true },
      { tipo: "radio", key: "niv_liquido_transmision", label: "Líquido de transmisión", opciones: ESTADO_3, requerido: true, fotoKey: "niv_evidencia_transmision", fotoLabel: "Evidencia fotográfica (transmisión)", fotoRequerido: true },
      { tipo: "radio", key: "int_bateria", label: "Batería (Física)", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_bateria", fotoLabel: "Evidencia fotográfica (batería)", fotoRequerido: true },
    ],
  },
  {
    key: "exterior",
    titulo: "Exterior",
    campos: [
      { tipo: "foto", key: "ext_evidencia_frente", label: "Evidencia fotográfica del frente del vehículo", requerido: true },
      { tipo: "radio", key: "ext_parabrisas_delantero", label: "Parabrisas", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_parabrisas_delantero", fotoLabel: "Evidencia fotográfica del parabrisas delantero", fotoRequerido: true },
      { tipo: "radio", key: "ext_espejos_laterales", label: "Espejo lateral izquierdo", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_espejos_laterales", fotoLabel: "Evidencia fotográfica espejo lateral izquierdo", fotoRequerido: true },
      { tipo: "radio", key: "ext_espejo_lateral_der", label: "Espejo lateral derecho", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_espejo_lateral_der", fotoLabel: "Evidencia fotográfica espejo lateral derecho", fotoRequerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_del_izq", label: "Evidencia fotográfica del faro delantero izquierdo", requerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_del_der", label: "Evidencia fotográfica del faro delantero derecho", requerido: true },
      { tipo: "radio", key: "ext_faros_neblineros", label: "Faros neblineros", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_faros_neblineros", fotoLabel: "Evidencia fotográfica faros neblineros", fotoRequerido: true },
      { tipo: "foto", key: "ext_evidencia_lateral_der", label: "Evidencia fotográfica del lateral derecho", requerido: true },
      { tipo: "radio", key: "ext_llanta_del_der", label: "Llanta delantera derecha", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_del_der", fotoLabel: "Evidencia fotográfica llanta delantera derecha", fotoRequerido: true },
      { tipo: "radio", key: "ext_llanta_tras_der", label: "Llanta trasera derecha (exterior)", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_tras_der", fotoLabel: "Evidencia fotográfica llanta trasera derecha (exterior)", fotoRequerido: true },
      // Rodado trasero doble — solo grúas (2 llantas por lado en el eje trasero, no 1 como un vehículo normal).
      { tipo: "radio", key: "ext_llanta_tras_der_interior", label: "Llanta trasera derecha (interior, rodado doble)", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_tras_der_interior", fotoLabel: "Evidencia fotográfica llanta trasera derecha (interior)", fotoRequerido: true, soloTipoVehiculo: "GRUA" },
      { tipo: "foto", key: "ext_evidencia_trasera", label: "Evidencia fotográfica parte trasera del vehículo", requerido: true },
      { tipo: "radio", key: "ext_parabrisas_posterior", label: "Medallón", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_parabrisas_posterior", fotoLabel: "Evidencia fotográfica del medallón", fotoRequerido: true },
      { tipo: "radio", key: "ext_faros_traseros", label: "Calavera izquierda", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_faro_tras_der", fotoLabel: "Evidencia calavera izquierda", fotoRequerido: true },
      { tipo: "radio", key: "ext_calavera_derecha", label: "Calavera derecha", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_calavera_derecha", fotoLabel: "Evidencia calavera derecha", fotoRequerido: true },
      { tipo: "foto", key: "ext_evidencia_faro_tras_izq", label: "Evidencia fotográfica del faro trasero izquierdo", requerido: true },
      { tipo: "radio", key: "ext_llanta_refaccion", label: "¿Estado de la llanta de refacción?", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_refaccion", fotoLabel: "Evidencia fotográfica del estado de la llanta de refacción", fotoRequerido: true },
      { tipo: "foto", key: "ext_evidencia_lateral_izq", label: "Evidencia fotográfica del lateral izquierdo", requerido: true },
      { tipo: "radio", key: "ext_llanta_tras_izq", label: "Llanta trasera izquierda (exterior)", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_tras_izq", fotoLabel: "Evidencia fotográfica llanta trasera izquierda (exterior)", fotoRequerido: true },
      { tipo: "radio", key: "ext_llanta_del_izq", label: "Llanta delantera izquierda", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_del_izq", fotoLabel: "Evidencia fotográfica llanta delantera izquierda", fotoRequerido: true },
      { tipo: "radio", key: "ext_llanta_tras_izq_interior", label: "Llanta trasera izquierda (interior, rodado doble)", opciones: ESTADO_LLANTA, requerido: true, fotoKey: "ext_evidencia_llanta_tras_izq_interior", fotoLabel: "Evidencia fotográfica llanta trasera izquierda (interior)", fotoRequerido: true, soloTipoVehiculo: "GRUA" },
      { tipo: "radio", key: "ext_antena", label: "Antena", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "ext_evidencia_antena", fotoLabel: "Evidencia fotográfica (antena)", fotoRequerido: true },
    ],
  },
  {
    key: "interior",
    titulo: "Interior",
    campos: [
      { tipo: "radio", key: "int_orden_limpieza_cabina", label: "Orden y limpieza de cabina delantera", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_cabina", fotoLabel: "Evidencia fotográfica cabina delantera", fotoRequerido: true },
      { tipo: "radio", key: "int_espejo_retrovisor", label: "Espejo retrovisor", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_espejo_retrovisor", fotoLabel: "Evidencia fotográfica espejo retrovisor", fotoRequerido: true },
      { tipo: "radio", key: "int_estado_tablero", label: "Estado del tablero", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_tablero", fotoLabel: "Evidencia fotográfica del tablero", fotoRequerido: true },
      { tipo: "numero", key: "int_porcentaje_combustible", label: "Especifique el porcentaje del nivel de combustible", requerido: true, min: 0, max: 100 },
      { tipo: "radio", key: "int_volante", label: "Volante", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_volante", fotoLabel: "Evidencia fotográfica (volante)", fotoRequerido: true },
      { tipo: "foto", key: "int_evidencia_combustible", label: "Evidencia fotográfica del nivel de combustible", requerido: true },
      { tipo: "foto", key: "int_evidencia_tarjeta_circulacion", label: "Evidencia fotográfica tarjeta de circulación", requerido: true },
      { tipo: "radio", key: "int_papel_verificacion", label: "Papel de verificación", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_papel_verificacion", fotoLabel: "Evidencia fotográfica (papel de verificación)", fotoRequerido: true },
      { tipo: "foto", key: "int_evidencia_engomado", label: "Evidencia fotográfica del engomado", requerido: true },
      { tipo: "toggle", key: "int_poliza_seguro", label: "Póliza de seguro", opciones: ["NA", "N", "Y"], requerido: false },
      { tipo: "radio", key: "int_freno_mano", label: "Palanca o pedal de estacionamiento", opciones: BUEN_MAL_NA, requerido: false, fotoKey: "int_evidencia_freno_estacionamiento", fotoLabel: "Evidencia fotográfica (freno de estacionamiento)", fotoRequerido: true },
      { tipo: "radio", key: "int_claxon", label: "Claxon", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_cortas", label: "Luces cortas", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_largas", label: "Luces largas", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luces_direccionales", label: "Luces direccionales", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_luz_stop", label: "Luz de stop", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_intermitentes", label: "Intermitentes", opciones: BUEN_MAL_NA, requerido: false },
      { tipo: "radio", key: "int_cinturones_seguridad", label: "Cinturón de seguridad piloto", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_cinturones", fotoLabel: "Evidencia fotográfica (cinturón piloto)", fotoRequerido: true },
      { tipo: "radio", key: "int_cinturon_copiloto", label: "Cinturón de seguridad copiloto", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_cinturon_copiloto", fotoLabel: "Evidencia fotográfica (cinturón copiloto)", fotoRequerido: true },
      { tipo: "radio", key: "int_cinturones_traseros", label: "Cinturones de seguridad traseros", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_cinturones_traseros", fotoLabel: "Evidencia fotográfica (cinturones traseros)", fotoRequerido: true },
      { tipo: "radio", key: "int_ventanillas", label: "Funcionamiento de ventanilla piloto", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_ventanillas", fotoLabel: "Evidencia fotográfica (ventanilla piloto)", fotoRequerido: true },
      { tipo: "radio", key: "int_ventanilla_copiloto", label: "Ventanilla copiloto", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_ventanilla_copiloto", fotoLabel: "Evidencia fotográfica (ventanilla copiloto)", fotoRequerido: true },
      { tipo: "radio", key: "int_ventanilla_tras_der", label: "Ventanilla trasera derecha", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_ventanilla_tras_der", fotoLabel: "Evidencia fotográfica (ventanilla trasera derecha)", fotoRequerido: true },
      { tipo: "radio", key: "int_ventanilla_tras_izq", label: "Ventanilla trasera izquierda", opciones: BUEN_MAL_NA, requerido: true, fotoKey: "int_evidencia_ventanilla_tras_izq", fotoLabel: "Evidencia fotográfica (ventanilla trasera izquierda)", fotoRequerido: true },
    ],
  },
  {
    key: "herramientas",
    titulo: "Herramientas",
    campos: [
      { tipo: "radio", key: "her_gato", label: "Gato", opciones: BUEN_MAL_NA2, requerido: true, fotoKey: "her_evidencia_gato", fotoLabel: "Evidencia fotográfica (gato)", fotoRequerido: true },
      { tipo: "radio", key: "her_palanca_ruedas", label: "Herramientas de palanca de ruedas", opciones: BUEN_MAL_NA2, requerido: true, fotoKey: "her_evidencia_palanca", fotoLabel: "Evidencia fotográfica (palanca de ruedas)", fotoRequerido: true },
      { tipo: "radio", key: "her_triangulo_reflejante", label: "Triángulo reflejante", opciones: BUEN_MAL_NA2, requerido: true, fotoKey: "her_evidencia_triangulo", fotoLabel: "Evidencia fotográfica (triángulo reflejante)", fotoRequerido: true },
      { tipo: "foto", key: "her_evidencia_herramientas", label: "Evidencia fotográfica de herramientas", requerido: true },
      { tipo: "textarea", key: "her_observaciones", label: "Observación de irregularidades", requerido: false },
    ],
  },
];

for (const seccion of SECCIONES_CHECKLIST_SEMANAL) {
  for (const campo of seccion.campos) {
    if (campo.tipo !== "foto") ETIQUETA_CAMPO_SEMANAL[campo.key] = campo.label;
  }
}

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
