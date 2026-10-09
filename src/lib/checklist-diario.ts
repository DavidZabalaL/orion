// Catálogo de etiquetas y lógica de alertas para el checklist DIARIO — a
// diferencia de SEMANAL/CARGA_COMBUSTIBLE/REPORTE_FALLA, el Diario no tenía
// un catálogo declarativo propio (su wizard es JSX fijo); este archivo reúne
// las etiquetas visibles ya usadas en wizard-diario.tsx para poder generar
// reportes/exportaciones legibles sin duplicar el wizard completo.
export const CAMPOS_DIARIO_LABEL: Record<string, string> = {
  gen_zona: "Estado",
  gen_municipio: "Municipio",
  gen_area: "Área",
  gen_responsable: "Responsable",
  gen_tipo_licencia: "Tipo de licencia",
  niv_luz_check: "¿Luz de check encendida?",
  niv_nivel_combustible: "Nivel de combustible",
  ext_tiene_golpes: "¿Tiene golpes?",
  ext_parabrisas_espejos: "Estado del parabrisas y espejos",
  seg_gato: "¿Cuenta con gato?",
  seg_cables_corriente: "¿Cuenta con cables de corriente?",
  seg_llanta_refaccion: "¿Cuenta con llanta de refacción?",
  seg_observaciones: "Observaciones",
};

export const CAMPOS_FOTO_DIARIO_LABEL: Record<string, string> = {
  gen_foto_licencia: "Foto de licencia",
  niv_evidencia_luz_check: "Evidencia fotográfica (luz de check)",
  niv_evidencia_combustible: "Evidencia fotográfica (combustible)",
  ext_evidencia_golpes_1: "Foto de evidencia de golpes 1",
  ext_evidencia_golpes_2: "Foto de evidencia de golpes 2",
  ext_evidencia_golpes_3: "Foto de evidencia de golpes 3",
  ext_evidencia_parabrisas_espejos: "Foto parabrisas y espejos",
  ext_evidencia_frente: "Foto frente del vehículo",
  ext_evidencia_lado_derecho: "Foto lado derecho",
  ext_evidencia_parte_trasera: "Foto parte trasera",
  ext_evidencia_lado_izquierdo: "Foto lado izquierdo",
  ext_brazo_grua: "Foto brazo de grúa",
  int_evidencia_tarjeta_circulacion: "Foto tarjeta de circulación",
  int_evidencia_tarjeta_combustible: "Foto tarjeta de combustible",
  seg_firma_responsable: "Firma del responsable",
};

const CLAVES_FOTO_O_FIRMA_DIARIO = new Set(Object.keys(CAMPOS_FOTO_DIARIO_LABEL));

export function esCampoTextoDiario(key: string): boolean {
  return !CLAVES_FOTO_O_FIRMA_DIARIO.has(key);
}

export const PUNTOS_INSPECCION_LABEL: Record<string, string> = {
  luces: "Luces",
  frenos: "Frenos",
  llantas: "Llantas",
  niveles: "Niveles (aceite/agua)",
  documentos: "Documentos a bordo",
  limpieza: "Limpieza general",
};

/**
 * "revisar" en puntosInspeccion es la señal de alerta ya usada por el propio
 * wizard (botón ⚠ Revisar); se complementa con los valores de respuestasSemanal
 * que ya representan un hallazgo negativo en el checklist diario.
 */
export function tieneAlertaDiario(
  puntosInspeccion: Record<string, string> | null | undefined,
  respuestas: Record<string, string> | null | undefined
): boolean {
  const p = puntosInspeccion ?? {};
  const r = respuestas ?? {};
  if (Object.entries(p).some(([k, v]) => !k.endsWith("_foto") && v === "revisar")) return true;
  if (r.ext_tiene_golpes === "SÍ") return true;
  if (r.niv_luz_check === "SÍ") return true;
  if (r.niv_nivel_combustible === "MÍNIMO") return true;
  if (["ESTRELLADO", "ROTO"].includes(r.ext_parabrisas_espejos ?? "")) return true;
  if (r.seg_gato === "NO" || r.seg_cables_corriente === "NO" || r.seg_llanta_refaccion === "NO") return true;
  return false;
}
