import type {
  EstatusUnidad,
  MotivoIndisponibilidad,
  TipoSiniestro,
  EstatusSiniestro,
  EstatusGasto,
} from "@/generated/prisma/enums";

// Archivo puro (sin Prisma ni ninguna dependencia server-only): EstatusFlotaDocument
// lo importa para armar el PDF también en el cliente (descarga inmediata desde
// EstatusFlotaModal) — si estas etiquetas vivieran junto a calcularEstatusFlota
// en estatus-flota.ts, ese import arrastraría `@/lib/prisma` (y por lo tanto
// `pg`/módulos de Node) al bundle del navegador.

export const LABEL_ESTATUS: Record<EstatusUnidad, string> = {
  ACTIVO: "Activas",
  INACTIVO: "Inactivas",
  BAJA: "Bajas",
};

export const LABEL_MOTIVO: Record<MotivoIndisponibilidad, string> = {
  MANTENIMIENTO: "Mantenimiento",
  SINIESTRO: "Siniestro",
  SIN_OPERADOR: "Sin operador asignado",
  TRAMITE_DOCUMENTACION: "Trámite / documentación",
  SIN_COMBUSTIBLE: "Falta de combustible",
  FALLA_MECANICA: "Falla mecánica",
  OTRO: "Otro",
};

export const TIPO_SINIESTRO_LABEL: Record<TipoSiniestro, string> = {
  COLISION: "Colisión",
  ROBO_TOTAL: "Robo total",
  ROBO_PARCIAL: "Robo parcial",
  VANDALISMO: "Vandalismo",
  INCENDIO: "Incendio",
  FENOMENO_NATURAL: "Fenómeno natural",
  OTRO: "Otro",
};

export const ESTATUS_SINIESTRO_LABEL: Record<EstatusSiniestro, string> = {
  ABIERTO: "Abierto",
  EN_PROCESO: "En proceso",
  CERRADO: "Cerrado",
  CERRADO_SIN_INDEMNIZACION: "Cerrado sin indemnización",
};

export const ESTATUS_GASTO_LABEL: Record<EstatusGasto, string> = {
  PROGRAMADO: "Programado",
  EN_PROCESO: "En proceso",
  REALIZADO: "Realizado",
  PENDIENTE_DE_PAGO: "Pendiente de pago",
  PAGADO: "Pagado",
  CANCELADO: "Cancelado",
};
