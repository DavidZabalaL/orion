import type { EstatusUnidad, MotivoIndisponibilidad } from "@/generated/prisma/enums";

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
  OTRO: "Otro",
};
