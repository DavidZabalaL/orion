export const CATEGORIA_GASTO_LABEL: Record<string, string> = {
  MANTENIMIENTO_PREVENTIVO: "Mant. preventivo",
  MANTENIMIENTO_CORRECTIVO: "Mant. correctivo",
  LLANTAS: "Llantas",
  REFACCIONES: "Refacciones",
  CONSUMIBLES: "Consumibles",
  TENENCIA: "Tenencia",
  VERIFICACION: "Verificación",
  EMPLACAMIENTO: "Emplacamiento",
  ESTACIONAMIENTO: "Estacionamiento",
  MULTAS: "Multas",
  RENTA_VEHICULOS: "Renta de vehículos",
  CASETAS: "Casetas",
};

export const ESTATUS_GASTO_LABEL: Record<string, string> = {
  PROGRAMADO: "Programado",
  REALIZADO: "Realizado",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
};

export const ESTATUS_GASTO_STYLE: Record<string, { color: string; bg: string }> = {
  PROGRAMADO: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  REALIZADO: { color: "var(--color-status-asignado)", bg: "var(--status-asignado-bg)" },
  PAGADO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  CANCELADO: { color: "var(--sidebar-text)", bg: "var(--chip)" },
};
