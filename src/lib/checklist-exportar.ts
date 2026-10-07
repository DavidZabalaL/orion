// Fuente única de "cómo se exporta un checklist a Excel" (columnas por tipo,
// con las mismas etiquetas que ve el usuario en el wizard, y qué cuenta como
// alerta) — compartida entre /checklist/historial y el botón "Exportar
// checklist" de /checklist, para que ambos produzcan exactamente el mismo
// Excel y no se desincronicen.
import { SECCIONES_CHECKLIST_SEMANAL, VALORES_ALERTA_SEMANAL, todasLasClavesFoto } from "@/lib/checklist-semanal";
import { SECCIONES_CARGA_COMBUSTIBLE } from "@/lib/checklist-carga-combustible";
import { SECCIONES_REPORTE_FALLA } from "@/lib/checklist-reporte-falla";
import { CAMPOS_DIARIO_LABEL, PUNTOS_INSPECCION_LABEL, tieneAlertaDiario } from "@/lib/checklist-diario";
import { detectarAlertasCargaCombustible } from "@/lib/checklist-carga-combustible-alertas";
import type { TipoChecklist } from "@/generated/prisma/enums";

export const TIPO_CHECKLIST_LABEL: Record<TipoChecklist, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  CARGA_COMBUSTIBLE: "Carga de combustible",
  REPORTE_FALLA: "Reporte de falla",
};

function columnasSemanal(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [
    { key: "oficinaSede", label: "Oficina / Sede" },
    { key: "modelo", label: "Modelo" },
    { key: "tipoVehiculo", label: "Tipo de vehículo" },
    { key: "licenciaPermanente", label: "¿Licencia permanente?" },
    { key: "gen_odometro", label: "Odómetro" },
    { key: "gen_horometro", label: "Horómetro (grúa)" },
  ];
  for (const s of SECCIONES_CHECKLIST_SEMANAL) {
    for (const c of s.campos) {
      if (c.tipo !== "foto") cols.push({ key: c.key, label: c.label });
    }
  }
  return cols;
}

function columnasReporteFalla(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [];
  for (const s of SECCIONES_REPORTE_FALLA) {
    for (const c of s.campos) cols.push({ key: c.key, label: c.label });
  }
  return cols;
}

function columnasCombustible(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [];
  for (const s of SECCIONES_CARGA_COMBUSTIBLE) {
    for (const c of s.campos) cols.push({ key: c.key, label: c.label });
  }
  cols.push(
    { key: "porcentaje_antes", label: "% combustible antes" },
    { key: "porcentaje_despues", label: "% combustible después" },
    { key: "litros_cargados", label: "Litros cargados" },
    { key: "cantidad_pagada", label: "Importe cobrado" }
  );
  return cols;
}

function columnasDiario(): { key: string; label: string }[] {
  return [
    ...Object.entries(PUNTOS_INSPECCION_LABEL).map(([key, label]) => ({ key, label })),
    ...Object.entries(CAMPOS_DIARIO_LABEL).map(([key, label]) => ({ key, label })),
  ];
}

export const COLUMNAS_POR_TIPO: Record<TipoChecklist, { key: string; label: string }[]> = {
  DIARIO: columnasDiario(),
  SEMANAL: columnasSemanal(),
  CARGA_COMBUSTIBLE: columnasCombustible(),
  REPORTE_FALLA: columnasReporteFalla(),
};

const CLAVES_FOTO_SEMANAL = new Set([...todasLasClavesFoto(), "fotoLicenciaUrl"]);

/**
 * Qué cuenta como "alerta" para cada tipo de checklist — réplica exacta de
 * la lógica usada en /checklist/historial, para que el conteo/badge de
 * alertas sea idéntico en cualquier lugar que lo muestre.
 */
export function tieneAlertaChecklist(
  tipo: TipoChecklist,
  respuestas: Record<string, string>,
  puntosInspeccion: Record<string, string> | null,
  capacidadTanqueLitros: number | null,
  precioPromedioLitro: number | null
): boolean {
  switch (tipo) {
    case "SEMANAL":
      return Object.entries(respuestas).some(([k, v]) => !CLAVES_FOTO_SEMANAL.has(k) && VALORES_ALERTA_SEMANAL.has(v));
    case "CARGA_COMBUSTIBLE":
      return (
        detectarAlertasCargaCombustible({
          porcentajeAntes: respuestas.porcentaje_antes,
          porcentajeDespues: respuestas.porcentaje_despues,
          litrosCargados: respuestas.litros_cargados,
          cantidadPagada: respuestas.cantidad_pagada,
          capacidadTanqueLitros,
          precioPromedioLitro,
        }).length > 0
      );
    case "DIARIO":
      return tieneAlertaDiario(puntosInspeccion, respuestas);
    case "REPORTE_FALLA":
      return true; // un reporte de falla es, por definición, una alerta
    default:
      return false;
  }
}
