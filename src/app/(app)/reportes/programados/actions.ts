"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { tienePermisoModulo, exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { obtenerDataset, type FiltroGuardable } from "@/lib/bi/metadata";
import { validarColumnasTabla } from "@/lib/bi/motor-consultas";
import { ejecutarReporteProgramado } from "@/lib/bi/motor-reportes";
import type { FrecuenciaReporte, FormatoReporte } from "@/generated/prisma/enums";

export const TIPO_BI_TABLA = "bi_tabla";

export type ReporteProgramadoRow = {
  id: string;
  nombre: string;
  tipo: string;
  frecuencia: FrecuenciaReporte;
  formato: FormatoReporte;
  hora: string;
  diaSemana: number;
  diaMes: number;
  destinatarios: string[];
  activo: boolean;
  ultimaEjecucionEn: Date | null;
  ultimoEstatus: string | null;
  ultimoErrorDetalle: string | null;
  creadoPorNombre: string;
};

export async function listarReportesProgramados(): Promise<ReporteProgramadoRow[]> {
  await exigirPermisoModulo("M");
  const reportes = await prisma.reporteProgramado.findMany({
    include: { creadoPor: { select: { nombre: true } } },
    orderBy: { createdAt: "desc" },
  });
  return reportes.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    frecuencia: r.frecuencia,
    formato: r.formato,
    hora: r.hora,
    diaSemana: r.diaSemana,
    diaMes: r.diaMes,
    destinatarios: Array.isArray(r.destinatarios) ? (r.destinatarios as unknown[]).filter((d): d is string => typeof d === "string") : [],
    activo: r.activo,
    ultimaEjecucionEn: r.ultimaEjecucionEn,
    ultimoEstatus: r.ultimoEstatus,
    ultimoErrorDetalle: r.ultimoErrorDetalle,
    creadoPorNombre: r.creadoPor.nombre,
  }));
}

export type ResultadoReporteProgramado = { ok: true; id?: string } | { ok: false; error: string };

export async function guardarReporteBiTabla(input: {
  id?: string;
  nombre: string;
  datasetId: string;
  columnas: string[];
  filtros?: FiltroGuardable[];
  proyectoIds?: string[];
  destinatarios: string[];
  frecuencia: FrecuenciaReporte;
  hora: string;
  diaSemana?: number;
  diaMes?: number;
  formato: FormatoReporte;
}): Promise<ResultadoReporteProgramado> {
  await exigirPermisoModulo("M");

  const nombre = input.nombre.trim().slice(0, 120);
  if (!nombre) return { ok: false, error: "Ponle un nombre al reporte." };

  const dataset = obtenerDataset(input.datasetId);
  if (!dataset) return { ok: false, error: "Dataset inválido." };
  const columnas = validarColumnasTabla(dataset, input.columnas);
  if (!columnas) return { ok: false, error: "Columnas inválidas (máximo 15, deben existir en el dataset)." };

  const destinatarios = input.destinatarios.map((d) => d.trim()).filter(Boolean);
  if (destinatarios.length === 0) return { ok: false, error: "Agrega al menos un destinatario." };
  const invalidos = destinatarios.filter((d) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d));
  if (invalidos.length > 0) return { ok: false, error: `Correo(s) inválido(s): ${invalidos.join(", ")}` };

  if (!/^\d{2}:\d{2}$/.test(input.hora)) return { ok: false, error: "Hora inválida." };

  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const data = {
    nombre,
    tipo: TIPO_BI_TABLA,
    camposJson: { datasetId: input.datasetId, columnas: columnas.map((c) => c.id) },
    filtrosJson: { filtros: input.filtros ?? [], proyectoIds: input.proyectoIds ?? [] },
    destinatarios,
    hora: input.hora,
    diaSemana: input.diaSemana ?? 1,
    diaMes: input.diaMes ?? 1,
    frecuencia: input.frecuencia,
    formato: input.formato,
  };

  try {
    const reporte = input.id
      ? await prisma.reporteProgramado.update({ where: { id: input.id }, data })
      : await prisma.reporteProgramado.create({ data: { ...data, creadoPorId: session.user.id } });

    await logActivity({
      userId: session.user.id,
      modulo: "reportes",
      accion: input.id ? "update" : "create",
      entidad: "ReporteProgramado",
      entidadId: reporte.id,
      detalle: { nombre, datasetId: input.datasetId },
    });

    revalidatePath("/reportes/programados");
    return { ok: true, id: reporte.id };
  } catch {
    return { ok: false, error: "No se pudo guardar el reporte." };
  }
}

export async function alternarActivoReporte(id: string, activo: boolean): Promise<ResultadoReporteProgramado> {
  await exigirPermisoModulo("M");
  await prisma.reporteProgramado.update({ where: { id }, data: { activo } });
  revalidatePath("/reportes/programados");
  return { ok: true };
}

export async function eliminarReporteProgramado(id: string): Promise<ResultadoReporteProgramado> {
  await exigirPermisoModulo("M");
  await prisma.reporteProgramado.delete({ where: { id } });
  revalidatePath("/reportes/programados");
  return { ok: true };
}

export async function ejecutarReporteAhora(id: string): Promise<ResultadoReporteProgramado> {
  if (!(await tienePermisoModulo("M"))) return { ok: false, error: "No tienes permiso." };
  const resultado = await ejecutarReporteProgramado(id);
  revalidatePath("/reportes/programados");
  if (!resultado.ok) return { ok: false, error: resultado.error ?? "No se pudo ejecutar el reporte." };
  return { ok: true };
}
