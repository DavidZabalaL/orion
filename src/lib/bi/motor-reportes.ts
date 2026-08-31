// Núcleo compartido de ejecución de un ReporteProgramado: resuelve filas,
// genera el archivo (PDF/Excel) y envía el correo. Lo usan tanto el cron de
// Vercel (src/app/api/cron/reportes-programados/route.ts) como el botón
// "Ejecutar ahora" del generador — una sola implementación, sin duplicar
// lógica entre el disparo automático y el manual.
import { prisma } from "@/lib/prisma";
import { proyectosPermitidosParaModuloDeUsuario } from "@/lib/proyectos-usuario";
import { resolverFilasReporte } from "@/lib/bi/ejecutar-reporte";
import { generarExcelReporte } from "@/lib/bi/excel-export";
import { generarPdfReporte } from "@/lib/bi/pdf/reporte-tabla-pdf";
import { enviarReporteBI } from "@/lib/email";
import { registrarAccesoReporteBI } from "@/lib/bi/auditoria";
import { calcularEstatusFlota } from "@/lib/reportes/estatus-flota";
import { generarEstatusFlotaBuffer } from "@/lib/reportes/estatus-flota-pdf";
import { inicioDeHoyMx } from "@/lib/timezone";

const TIPO_ESTATUS_FLOTA = "estatus_flota";
const DIA_MS = 24 * 60 * 60 * 1000;

export type ResultadoEjecucionReporte = { ok: boolean; estatus: "ok" | "error" | "sin_destinatarios"; error?: string };

export async function ejecutarReporteProgramado(reporteId: string): Promise<ResultadoEjecucionReporte> {
  const reporte = await prisma.reporteProgramado.findUnique({ where: { id: reporteId } });
  if (!reporte) return { ok: false, estatus: "error", error: "Reporte no encontrado." };

  const destinatarios = (Array.isArray(reporte.destinatarios) ? (reporte.destinatarios as unknown[]) : []).filter((d): d is string => typeof d === "string");
  if (destinatarios.length === 0) {
    await registrarEjecucion(reporteId, "sin_destinatarios", "El reporte no tiene destinatarios configurados.", 0);
    return { ok: false, estatus: "sin_destinatarios", error: "Sin destinatarios." };
  }

  try {
    let proyectoIds: string[] | null;
    let buffer: Buffer;
    let nombreArchivo: string;
    let totalRegistros: number;
    const mime = reporte.tipo === TIPO_ESTATUS_FLOTA || reporte.formato === "PDF"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (reporte.tipo === TIPO_ESTATUS_FLOTA) {
      // Reporte de estatus de flota (ver src/lib/reportes/estatus-flota.ts):
      // el alcance de proyectos lo elige quien configuró el envío en el
      // Dashboard (filtrosJson), no se deriva de sus permisos como el resto
      // de tipos — así "General" siempre significa lo mismo sin importar
      // quién quedó como creadoPorId. Cubre la última semana corrida
      // (lunes a lunes, mismo criterio que el cron para SEMANAL).
      const filtros = reporte.filtrosJson as { proyectoIds?: string[] | null } | null;
      proyectoIds = filtros?.proyectoIds ?? null;
      const hasta = inicioDeHoyMx();
      const desde = new Date(hasta.getTime() - 7 * DIA_MS);
      const proyectoLabel = proyectoIds === null ? "General" : `${proyectoIds.length} proyecto(s)`;
      const datos = await calcularEstatusFlota({ proyectoIds, desde, hasta, proyectoLabel });
      buffer = await generarEstatusFlotaBuffer(datos);
      nombreArchivo = `estatus-flota-${hasta.toISOString().slice(0, 10)}.pdf`;
      totalRegistros = datos.totalUnidades;
    } else {
      proyectoIds = await proyectosPermitidosParaModuloDeUsuario(reporte.creadoPorId, "J");
      const campos = Array.isArray(reporte.camposJson) ? (reporte.camposJson as unknown[]).filter((c): c is string => typeof c === "string") : [];
      const { columnas, filas } = await resolverFilasReporte(reporte.tipo, campos, proyectoIds);

      const esPdf = reporte.formato === "PDF";
      buffer = esPdf ? await generarPdfReporte(reporte.nombre, columnas, filas) : generarExcelReporte(reporte.nombre, columnas, filas);
      nombreArchivo = `${reporte.nombre.replace(/[^a-z0-9-_]+/gi, "_")}.${esPdf ? "pdf" : "xlsx"}`;
      totalRegistros = filas.length;
    }

    const envio = await enviarReporteBI({ destinatarios, nombreReporte: reporte.nombre, buffer, nombreArchivo, mime });
    if (!envio.enviado) {
      await registrarEjecucion(reporteId, "error", envio.error ?? "No se pudo enviar el correo.", destinatarios.length);
      return { ok: false, estatus: "error", error: envio.error };
    }

    await registrarEjecucion(reporteId, "ok", `${totalRegistros} registro(s) enviados a ${destinatarios.length} destinatario(s).`, destinatarios.length);
    await registrarAccesoReporteBI({
      userId: reporte.creadoPorId,
      tipoRecurso: "reporte_programado",
      accion: "recibio_correo",
      recursoId: reporteId,
      proyectoIds: proyectoIds ?? [],
      detalle: { destinatarios, filas: totalRegistros },
    });
    return { ok: true, estatus: "ok" };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido al generar el reporte.";
    await registrarEjecucion(reporteId, "error", mensaje, destinatarios.length);
    return { ok: false, estatus: "error", error: mensaje };
  }
}

async function registrarEjecucion(reporteId: string, estatus: "ok" | "error" | "sin_destinatarios", detalle: string, destinatariosCount: number): Promise<void> {
  await prisma.$transaction([
    prisma.ejecucionReporteProgramado.create({ data: { reporteId, estatus, detalle, destinatariosCount } }),
    prisma.reporteProgramado.update({
      where: { id: reporteId },
      data: { ultimaEjecucionEn: new Date(), ultimoEstatus: estatus, ultimoErrorDetalle: estatus === "ok" ? null : detalle },
    }),
  ]);
}
