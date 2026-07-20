export const ESTATUS_OPERADOR_LABEL: Record<string, string> = {
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  BAJA: "Baja",
};

export const ESTATUS_DOCUMENTAL_STYLE: Record<string, { color: string; bg: string }> = {
  COMPLETO: { color: "var(--color-status-cerrado)", bg: "var(--status-cerrado-bg)" },
  INCOMPLETO: { color: "var(--color-status-revision)", bg: "var(--status-revision-bg)" },
  VENCIDO: { color: "var(--color-status-escena)", bg: "var(--status-escena-bg)" },
};

export const ESTATUS_DOCUMENTAL_LABEL: Record<string, string> = {
  COMPLETO: "Completo",
  INCOMPLETO: "Incompleto",
  VENCIDO: "Vencido",
};

export const TIPO_DOCUMENTO_LABEL: Record<string, string> = {
  LICENCIA: "Licencia de conducir",
  INE: "INE / identificación oficial",
  COMPROBANTE_DOMICILIO: "Comprobante de domicilio",
  ANTECEDENTES: "Antecedentes no penales",
  CSF: "Constancia de situación fiscal",
  EXAMEN_MEDICO: "Examen médico",
  ANTIDOPING: "Prueba antidoping",
  CURSO_MANEJO: "Curso de manejo defensivo",
  CERTIFICACION: "Certificación adicional",
};

export const TIPO_SANGRE_LABEL: Record<string, string> = {
  O_POSITIVO: "O+",
  O_NEGATIVO: "O-",
  A_POSITIVO: "A+",
  A_NEGATIVO: "A-",
  B_POSITIVO: "B+",
  B_NEGATIVO: "B-",
  AB_POSITIVO: "AB+",
  AB_NEGATIVO: "AB-",
};
