export type FuenteActividad = "combustible" | "tag" | "gps";

export type ResumenActividad = {
  ultimaActividad: Date | null;
  diasSinActividad: number | null;
  fuente: FuenteActividad | null;
};

const LABEL_FUENTE: Record<FuenteActividad, string> = {
  combustible: "carga de combustible",
  tag: "cruce de TAG",
  gps: "posición GPS",
};

export function labelFuenteActividad(fuente: FuenteActividad | null): string {
  return fuente ? LABEL_FUENTE[fuente] : "sin actividad registrada";
}

export type ResumenDiasSinOperar = {
  diasSinOperar: number;
  operando: boolean;
  /** "apagada": el contador corre desde que se apagó con el botón de encendido/apagado.
   *  "actividad": todavía no se ha apagado nunca — se estima con la última señal de
   *  combustible/TAG/GPS que tengamos, para no dejar el dato en blanco.
   *  "sin_datos": no hay switch ni actividad registrada. */
  origen: "apagada" | "actividad" | "sin_datos";
  fuente: FuenteActividad | null;
};

/**
 * "Días sin operar" está atado al botón de encendido/apagado (disponibilidad):
 * al apagar la unidad empieza a contar desde ese momento (fechaCambioDisponibilidad).
 * Mientras está encendida (disponible) se considera operando y el contador es 0.
 * Si nunca se ha usado el botón (fechaCambioDisponibilidad nula) se estima con la
 * actividad real de combustible/TAG/GPS como respaldo, para unidades ya apagadas
 * desde antes de que existiera el botón.
 */
export function calcularDiasSinOperar(
  disponibilidad: boolean,
  fechaCambioDisponibilidad: Date | string | null | undefined,
  ultimoCombustible: Date | string | null | undefined,
  ultimoTag: Date | string | null | undefined,
  ultimoGps: Date | string | null | undefined
): ResumenDiasSinOperar {
  if (disponibilidad) {
    return { diasSinOperar: 0, operando: true, origen: "actividad", fuente: null };
  }

  if (fechaCambioDisponibilidad) {
    const dias = Math.max(0, Math.floor((Date.now() - new Date(fechaCambioDisponibilidad).getTime()) / 86_400_000));
    return { diasSinOperar: dias, operando: false, origen: "apagada", fuente: null };
  }

  const { diasSinActividad, fuente } = calcularDiasSinActividad(ultimoCombustible, ultimoTag, ultimoGps);
  if (diasSinActividad !== null) {
    return { diasSinOperar: diasSinActividad, operando: false, origen: "actividad", fuente };
  }
  return { diasSinOperar: 0, operando: false, origen: "sin_datos", fuente: null };
}

/**
 * "Días sin operar" ya no es un contador manual: se calcula con base en la
 * señal de actividad más reciente que tengamos de la unidad — la que sea más
 * reciente entre última carga de combustible, último cruce de TAG y última
 * posición GPS. Null cuando no hay ninguna de las tres.
 */
export function calcularDiasSinActividad(
  ultimoCombustible: Date | string | null | undefined,
  ultimoTag: Date | string | null | undefined,
  ultimoGps: Date | string | null | undefined
): ResumenActividad {
  const candidatos: { fecha: Date; fuente: FuenteActividad }[] = [];
  if (ultimoCombustible) candidatos.push({ fecha: new Date(ultimoCombustible), fuente: "combustible" });
  if (ultimoTag) candidatos.push({ fecha: new Date(ultimoTag), fuente: "tag" });
  if (ultimoGps) candidatos.push({ fecha: new Date(ultimoGps), fuente: "gps" });

  if (candidatos.length === 0) return { ultimaActividad: null, diasSinActividad: null, fuente: null };

  const masReciente = candidatos.reduce((a, b) => (b.fecha.getTime() > a.fecha.getTime() ? b : a));
  const diasSinActividad = Math.max(0, Math.floor((Date.now() - masReciente.fecha.getTime()) / 86_400_000));
  return { ultimaActividad: masReciente.fecha, diasSinActividad, fuente: masReciente.fuente };
}
