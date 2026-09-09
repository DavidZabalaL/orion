export const CAMPOS_UNIDAD = [
  { key: "numeroEconomico", label: "N° económico", requerido: true },
  { key: "placas", label: "Placas", requerido: true },
  { key: "numeroSerie", label: "N° de serie (VIN, 17 caracteres)", requerido: true },
  { key: "marca", label: "Marca", requerido: true },
  { key: "unidadModelo", label: "Unidad / modelo comercial", requerido: true },
  { key: "anio", label: "Año", requerido: true },
  { key: "tipoVehiculo", label: "Tipo de vehículo", requerido: true },
  { key: "tipoCombustible", label: "Tipo de combustible", requerido: true },
  { key: "rendimientoPromedio", label: "Rendimiento promedio (km/L)", requerido: false },
  { key: "kmOficial", label: "Kilometraje", requerido: false },
  { key: "capacidadTanqueLitros", label: "Capacidad máxima de tanque (litros)", requerido: false },
  { key: "proyecto", label: "Proyecto", requerido: false },
  { key: "estatus", label: "Estatus (Activo/Inactivo/Baja)", requerido: false },
  { key: "motivoIndisponibilidad", label: "Motivo de no disponibilidad (solo si Estatus=Inactivo; ej. Mantenimiento, Siniestro, Sin operador, Trámite, Sin combustible, Otro)", requerido: false },
  { key: "motivoIndisponibilidadDetalle", label: "Detalle del motivo (opcional)", requerido: false },
  { key: "resguardante", label: "Resguardante (nombre del operador)", requerido: false },
  { key: "propietario", label: "Propietario (SYM/5 Star/Kabat)", requerido: false },
  { key: "origenPlaca", label: "Origen de placa (estado)", requerido: false },
  { key: "tagIave", label: "Tag IAVE", requerido: false },
  { key: "numeroTarjetaCombustible", label: "N° de tarjeta de combustible", requerido: false },
] as const;

export type CampoUnidadKey = (typeof CAMPOS_UNIDAD)[number]["key"];

const TIPO_VEHICULO_ALIAS: Record<string, string> = {
  AUTO: "AUTO", CARRO: "AUTO", SEDAN: "AUTO", SEDÁN: "AUTO",
  CAMIONETA: "CAMIONETA", PICKUP: "CAMIONETA", "PICK UP": "CAMIONETA", TRUCK: "CAMIONETA", VAN: "CAMIONETA", SUV: "CAMIONETA",
  GRUA: "GRUA", GRÚA: "GRUA", GRUAS: "GRUA",
  MOTO: "MOTO", MOTOCICLETA: "MOTO",
};

const TIPO_COMBUSTIBLE_ALIAS: Record<string, string> = {
  GASOLINA: "GASOLINA", GAS: "GASOLINA", MAGNA: "GASOLINA", PREMIUM: "GASOLINA",
  DIESEL: "DIESEL", DIÉSEL: "DIESEL",
  ELECTRICO: "ELECTRICO", ELÉCTRICO: "ELECTRICO",
  HIBRIDO: "HIBRIDO", HÍBRIDO: "HIBRIDO",
};

const ESTATUS_ALIAS: Record<string, string> = {
  ACTIVO: "ACTIVO", ACTIVA: "ACTIVO",
  INACTIVO: "INACTIVO", INACTIVA: "INACTIVO",
  BAJA: "BAJA",
};

const MOTIVO_INDISPONIBILIDAD_ALIAS: Record<string, string> = {
  MANTENIMIENTO: "MANTENIMIENTO",
  SINIESTRO: "SINIESTRO", ACCIDENTE: "SINIESTRO",
  SIN_OPERADOR: "SIN_OPERADOR", "SIN OPERADOR": "SIN_OPERADOR",
  TRAMITE_DOCUMENTACION: "TRAMITE_DOCUMENTACION", "TRAMITE / DOCUMENTACION": "TRAMITE_DOCUMENTACION", "TRÁMITE / DOCUMENTACIÓN": "TRAMITE_DOCUMENTACION", TRAMITE: "TRAMITE_DOCUMENTACION", TRÁMITE: "TRAMITE_DOCUMENTACION", DOCUMENTACION: "TRAMITE_DOCUMENTACION", DOCUMENTACIÓN: "TRAMITE_DOCUMENTACION",
  SIN_COMBUSTIBLE: "SIN_COMBUSTIBLE", "SIN COMBUSTIBLE": "SIN_COMBUSTIBLE", "FALTA DE COMBUSTIBLE": "SIN_COMBUSTIBLE",
  OTRO: "OTRO",
};

const PROPIETARIO_ALIAS: Record<string, string> = {
  SYM: "SYM",
  "5 STAR SYSTEM": "FIVE_STAR_SYSTEM", "5STAR": "FIVE_STAR_SYSTEM", "FIVE STAR SYSTEM": "FIVE_STAR_SYSTEM", "FIVE STAR": "FIVE_STAR_SYSTEM",
  KABAT: "KABAT",
};

function limpiar(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

export function normalizarEconomico(v: unknown) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function normalizarTipoVehiculo(v: unknown): { valor: string; reconocido: boolean } {
  const limpio = limpiar(v);
  const valor = TIPO_VEHICULO_ALIAS[limpio];
  return valor ? { valor, reconocido: true } : { valor: "OTRO", reconocido: false };
}

export function normalizarTipoCombustible(v: unknown): { valor: string; reconocido: boolean } {
  const limpio = limpiar(v);
  const valor = TIPO_COMBUSTIBLE_ALIAS[limpio];
  return valor ? { valor, reconocido: true } : { valor: "GASOLINA", reconocido: false };
}

export function normalizarEstatus(v: unknown): { valor: string; reconocido: boolean } {
  const limpio = limpiar(v);
  if (!limpio) return { valor: "ACTIVO", reconocido: true };
  const valor = ESTATUS_ALIAS[limpio];
  return valor ? { valor, reconocido: true } : { valor: "ACTIVO", reconocido: false };
}

/** A diferencia de los demás normalizadores, vacío es un resultado válido (columna opcional, unidad activa) — no cae a un valor por default. */
export function normalizarMotivoIndisponibilidad(v: unknown): { valor: string | null; reconocido: boolean } {
  const limpio = limpiar(v);
  if (!limpio) return { valor: null, reconocido: true };
  const valor = MOTIVO_INDISPONIBILIDAD_ALIAS[limpio];
  return valor ? { valor, reconocido: true } : { valor: null, reconocido: false };
}

export function normalizarPropietario(v: unknown): { valor: string; reconocido: boolean } {
  const limpio = limpiar(v);
  if (!limpio) return { valor: "OTRO", reconocido: true };
  const valor = PROPIETARIO_ALIAS[limpio];
  return valor ? { valor, reconocido: true } : { valor: "OTRO", reconocido: false };
}
