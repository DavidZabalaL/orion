export const ESTATUS_UNIDAD_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  BAJA: "Baja",
};

export const ESTATUS_UNIDAD_STYLE: Record<string, { color: string; bg: string }> = {
  ACTIVO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  INACTIVO: { color: "var(--sidebar-text)", bg: "var(--chip)" },
  BAJA: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
};

/**
 * Badge que se muestra para el estatus de una unidad — ligado al botón de
 * encendido/apagado: una unidad ACTIVO que se apaga (disponibilidad = false)
 * deja de mostrarse como "Activo" y pasa a "No disponible". Inactivo y Baja
 * no cambian con el switch (son estatus de ciclo de vida aparte, no el
 * operativo del día a día).
 */
export function estatusVisibleUnidad(estatus: string, disponibilidad: boolean): { label: string; color: string; bg: string } {
  if (estatus === "ACTIVO" && !disponibilidad) {
    return { label: "No disponible", color: "var(--sidebar-text)", bg: "var(--chip)" };
  }
  return {
    label: ESTATUS_UNIDAD_LABEL[estatus] ?? estatus,
    color: ESTATUS_UNIDAD_STYLE[estatus]?.color ?? "var(--sidebar-text)",
    bg: ESTATUS_UNIDAD_STYLE[estatus]?.bg ?? "var(--chip)",
  };
}

export const TIPO_VEHICULO_LABEL: Record<string, string> = {
  AUTO: "Auto",
  CAMIONETA: "Camioneta",
  GRUA: "Grúa",
  MOTO: "Moto",
  OTRO: "Otro",
};

export const ESTATUS_DOCUMENTAL_LABEL: Record<string, string> = {
  COMPLETO: "Completo",
  INCOMPLETO: "Incompleto",
  VENCIDO: "Vencido",
};

export const ESTATUS_SEGURO_STYLE: Record<string, { color: string; bg: string }> = {
  VIGENTE: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  POR_VENCER: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  VENCIDO: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
  RENOVADO: { color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
};

export const ESTATUS_SEGURO_LABEL: Record<string, string> = {
  VIGENTE: "Vigente",
  POR_VENCER: "Por vencer",
  VENCIDO: "Vencido",
  RENOVADO: "Renovado",
};

export const TIPO_COBERTURA_LABEL: Record<string, string> = {
  RC_TERCEROS: "RC daños a terceros",
  DANOS_MATERIALES: "Daños materiales",
  ROBO_TOTAL: "Robo total",
  ROBO_PARCIAL: "Robo parcial",
  GASTOS_MEDICOS: "Gastos médicos ocupantes",
  ASISTENCIA_VIAL: "Asistencia vial / grúa",
  RC_PERSONAS: "RC personas",
  COBERTURA_LEGAL: "Cobertura legal",
  PERDIDA_TOTAL: "Pérdida total",
  EXTENSION_RC: "Extensión RC (gobierno)",
  ESPECIAL: "Especiales",
};
