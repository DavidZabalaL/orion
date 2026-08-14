"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { ejecutarReporteProgramado, type ResultadoEjecucionReporte } from "@/lib/bi/motor-reportes";

export async function crearReporteProgramado(formData: FormData) {
  await exigirPermisoModulo("J", "editar");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const campos = formData.getAll("campos").map(String);
  const destinatarios = String(formData.get("destinatarios") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  const hora = String(formData.get("hora") ?? "08:00");
  const frecuencia = String(formData.get("frecuencia") ?? "SEMANAL");
  const formato = String(formData.get("formato") ?? "EXCEL") === "PDF" ? "PDF" : "EXCEL";

  if (!nombre || !tipo || campos.length === 0 || destinatarios.length === 0) {
    throw new Error("Nombre, tipo, al menos un campo y un destinatario son obligatorios.");
  }

  const session = await auth();
  if (!session?.user?.id) throw new Error("Sesión no válida.");

  const reporte = await prisma.reporteProgramado.create({
    data: {
      nombre,
      tipo,
      camposJson: campos,
      filtrosJson: {},
      destinatarios,
      hora,
      frecuencia: frecuencia as never,
      formato: formato as never,
      creadoPorId: session.user.id,
    },
  });

  await logActivity({
    userId: session.user.id,
    modulo: "reportes",
    accion: "create",
    entidad: "ReporteProgramado",
    entidadId: reporte.id,
    detalle: { nombre, tipo, frecuencia },
  });

  revalidatePath("/reportes");
}

export async function ejecutarReporteAhora(id: string): Promise<ResultadoEjecucionReporte> {
  await exigirPermisoModulo("J", "editar");
  if (!id) return { ok: false, estatus: "error", error: "Reporte inválido." };

  const resultado = await ejecutarReporteProgramado(id);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "reportes", accion: "update", entidad: "ReporteProgramado", entidadId: id, detalle: { accion: "ejecutar_ahora", estatus: resultado.estatus } });
  }

  revalidatePath("/reportes/generador");
  return resultado;
}

export async function alternarReporte(formData: FormData) {
  await exigirPermisoModulo("J", "editar");

  const id = String(formData.get("id") ?? "");
  const activo = String(formData.get("activo") ?? "true") === "true";
  await prisma.reporteProgramado.update({ where: { id }, data: { activo: !activo } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "reportes",
      accion: "update",
      entidad: "ReporteProgramado",
      entidadId: id,
      detalle: { campo: "activo", nuevo: !activo },
    });
  }

  revalidatePath("/reportes");
}
