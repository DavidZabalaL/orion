export const ESTATUS_UNIDAD_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  CONSIGNACION: "Consignación",
  DIRECCION: "Dirección",
  BAJA: "Baja",
};

export const ESTATUS_UNIDAD_STYLE: Record<string, { color: string; bg: string }> = {
  ACTIVO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  CONSIGNACION: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  DIRECCION: { color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
  BAJA: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
};

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
