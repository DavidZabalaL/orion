// Fuente única de "cómo se exporta un checklist a Excel" (columnas por tipo,
// con las mismas etiquetas que ve el usuario en el wizard, y qué cuenta como
// alerta) — compartida entre /checklist/historial y el botón "Exportar
// checklist" de /checklist, para que ambos produzcan exactamente el mismo
// Excel y no se desincronicen.
import { SECCIONES_CHECKLIST_SEMANAL, VALORES_ALERTA_SEMANAL, todasLasClavesFoto } from "@/lib/checklist-semanal";
import { SECCIONES_CARGA_COMBUSTIBLE } from "@/lib/checklist-carga-combustible";
import { SECCIONES_REPORTE_FALLA } from "@/lib/checklist-reporte-falla";
import { CAMPOS_DIARIO_LABEL, CAMPOS_FOTO_DIARIO_LABEL, PUNTOS_INSPECCION_LABEL, tieneAlertaDiario } from "@/lib/checklist-diario";
import { detectarAlertasCargaCombustible } from "@/lib/checklist-carga-combustible-alertas";
import { fmtFechaHora } from "@/lib/formato";
import type { HojaExcel } from "@/lib/exportar-excel";
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

// "¿Hay foto?" por campo fotográfico de cada tipo — Sí/No únicamente, nunca
// la URL/imagen en sí (pedido explícito: solo visibilidad de si falta
// evidencia, no incluirla en el Excel).
function columnasFotoSemanal(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [];
  for (const s of SECCIONES_CHECKLIST_SEMANAL) {
    for (const c of s.campos) {
      if (c.tipo === "foto") cols.push({ key: c.key, label: c.label });
      else if ("fotoKey" in c && c.fotoKey) cols.push({ key: c.fotoKey, label: c.fotoLabel ?? c.fotoKey });
    }
  }
  cols.push({ key: "fotoLicenciaUrl", label: "Foto de licencia" });
  return cols;
}

function columnasFotoReporteFalla(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [];
  for (const s of SECCIONES_REPORTE_FALLA) {
    for (const f of s.fotos) cols.push({ key: f.key, label: f.label });
  }
  return cols;
}

function columnasFotoCombustible(): { key: string; label: string }[] {
  const cols: { key: string; label: string }[] = [];
  for (const s of SECCIONES_CARGA_COMBUSTIBLE) {
    for (const f of s.fotos) cols.push({ key: f.key, label: f.label });
    if ("firma" in s && s.firma) cols.push({ key: s.firma.key, label: s.firma.label });
  }
  return cols;
}

function columnasFotoDiario(): { key: string; label: string }[] {
  return [
    ...Object.entries(PUNTOS_INSPECCION_LABEL).map(([key, label]) => ({ key: `${key}_foto`, label: `Foto: ${label}` })),
    { key: "horometro_foto", label: "Foto del horómetro" },
    ...Object.entries(CAMPOS_FOTO_DIARIO_LABEL).map(([key, label]) => ({ key, label })),
  ];
}

export const COLUMNAS_FOTO_POR_TIPO: Record<TipoChecklist, { key: string; label: string }[]> = {
  DIARIO: columnasFotoDiario(),
  SEMANAL: columnasFotoSemanal(),
  CARGA_COMBUSTIBLE: columnasFotoCombustible(),
  REPORTE_FALLA: columnasFotoReporteFalla(),
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

export type IndicadorExportableRow = {
  numeroEconomico: string;
  marcaModelo: string;
  proyecto: string | null;
  nivelAceite: string | null;
  estadoGato: string | null;
  peorLlanta: string | null;
  algunaLlantaNA: boolean;
  fecha: Date | string;
};

/** Réplica del botón "Exportar a Excel" que tenía IndicadoresChecklist — ahora se incluye como hoja opcional del exportador unificado de /checklist. */
export function construirHojaIndicadores(unidades: IndicadorExportableRow[]): HojaExcel {
  const headers = ["Unidad", "Marca / Modelo", "Proyecto", "Nivel de aceite", "Gato", "Peor llanta", "Último checklist"];
  const filas = unidades.map((u) => [
    u.numeroEconomico,
    u.marcaModelo,
    u.proyecto ?? "—",
    u.nivelAceite ?? "—",
    u.estadoGato ?? "—",
    u.peorLlanta ?? (u.algunaLlantaNA ? "N/A" : "—"),
    fmtFechaHora(u.fecha),
  ]);
  return { nombre: "Indicadores", headers, filas };
}

export type ChecklistExportableRow = {
  tipo: TipoChecklist;
  fecha: Date | string;
  odometro: number | null;
  horometro: number | null;
  unidad: { numeroEconomico: string; marca: string; unidadModelo: string };
  respuestasSemanal: Record<string, string>;
  puntosInspeccion: Record<string, string> | null;
  capturadoPor: { nombre: string } | null;
  alerta: boolean;
  /** Solo REPORTE_FALLA — para el SLA de resolución (ver EstatusReporteFalla). */
  estatusFalla?: string | null;
  fechaCierreFalla?: Date | string | null;
  costoResolucionFalla?: number | null;
};

/**
 * Arma el libro multi-hoja (una hoja por tipo presente, columnas con las
 * mismas etiquetas del wizard) — usado tanto por el botón "Exportar
 * checklist" (descarga directa) como por "Enviar por correo" (adjunto),
 * para que ambos generen exactamente el mismo Excel.
 */
export function construirHojasExcelChecklists(checklists: ChecklistExportableRow[]): HojaExcel[] {
  const encabezadoBase = ["Fecha", "Unidad", "Marca", "Modelo", "Capturado por", "Alerta"];
  return (Object.keys(TIPO_CHECKLIST_LABEL) as TipoChecklist[])
    .map((tipo) => {
      const filasTipo = checklists.filter((c) => c.tipo === tipo);
      if (filasTipo.length === 0) return null;

      const columnasExtra = COLUMNAS_POR_TIPO[tipo];
      const columnasFoto = COLUMNAS_FOTO_POR_TIPO[tipo];
      const encabezadoExtra = tipo === "DIARIO" ? ["Odómetro", "Horómetro", ...columnasExtra.map((c) => c.label)] : columnasExtra.map((c) => c.label);
      const encabezadoFoto = columnasFoto.map((c) => `¿Foto? ${c.label}`);
      const encabezadoFalla = tipo === "REPORTE_FALLA" ? ["Estatus", "Fecha de cierre", "Días para resolver", "Costo de resolución"] : [];

      const filas = filasTipo.map((c) => {
        const datos = tipo === "DIARIO" ? { ...(c.puntosInspeccion ?? {}), ...c.respuestasSemanal } : c.respuestasSemanal;
        const base = [fmtFechaHora(c.fecha), c.unidad.numeroEconomico, c.unidad.marca, c.unidad.unidadModelo, c.capturadoPor?.nombre ?? "—", c.alerta ? "Sí" : "No"];
        const extra = tipo === "DIARIO" ? [c.odometro ?? "", c.horometro ?? "", ...columnasExtra.map((col) => datos[col.key] ?? "")] : columnasExtra.map((col) => datos[col.key] ?? "");
        const foto = columnasFoto.map((col) => (datos[col.key] ? "Sí" : "No"));
        const falla =
          tipo === "REPORTE_FALLA"
            ? [
                c.estatusFalla === "CERRADO" ? "Cerrado" : "Abierto",
                c.fechaCierreFalla ? fmtFechaHora(c.fechaCierreFalla) : "—",
                String(
                  Math.max(0, Math.round(((c.fechaCierreFalla ? new Date(c.fechaCierreFalla) : new Date()).getTime() - new Date(c.fecha).getTime()) / 86_400_000))
                ),
                c.costoResolucionFalla != null ? c.costoResolucionFalla.toLocaleString("es-MX", { minimumFractionDigits: 2 }) : "",
              ]
            : [];
        return [...base, ...extra, ...foto, ...falla];
      });

      return { nombre: TIPO_CHECKLIST_LABEL[tipo], headers: [...encabezadoBase, ...encabezadoExtra, ...encabezadoFoto, ...encabezadoFalla], filas };
    })
    .filter((h): h is HojaExcel => h !== null);
}
