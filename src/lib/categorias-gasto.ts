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
  GASOLINA: "Gasolina",
  VIATICOS_OPERACION: "Viáticos de operación",
};

// Categorías que se pueden capturar en Mantenimiento (Ficha de Orden).
// Casetas se excluye porque su única fuente de gasto real es el módulo Tag/Peajes.
export const CATEGORIA_GASTO_LABEL_MANTENIMIENTO: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORIA_GASTO_LABEL).filter(([categoria]) => categoria !== "CASETAS")
);

// true si la categoría requiere número económico (unidad); false si es un gasto a nivel proyecto.
export const CATEGORIA_APLICA_A_UNIDAD: Record<string, boolean> = {
  MANTENIMIENTO_PREVENTIVO: true,
  MANTENIMIENTO_CORRECTIVO: true,
  LLANTAS: true,
  REFACCIONES: true,
  CONSUMIBLES: true,
  TENENCIA: true,
  VERIFICACION: true,
  EMPLACAMIENTO: true,
  ESTACIONAMIENTO: true,
  MULTAS: true,
  RENTA_VEHICULOS: true,
  CASETAS: true,
  GASOLINA: true,
  VIATICOS_OPERACION: false,
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
