"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";

export type ResultadoCrearTag = { ok: boolean; error?: string };

async function validarAsignacion(
  numeroEconomico: string | null,
  proyectoReportanteId: string | null,
  permitidos: string[] | null,
): Promise<string | null> {
  if (!numeroEconomico && !proyectoReportanteId) {
    return "Selecciona una unidad o un proyecto (para gastos operativos sin económico).";
  }
  if (permitidos === null) return null;
  if (numeroEconomico) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) return "No tienes permiso para realizar esta acción.";
  } else if (proyectoReportanteId && !permitidos.includes(proyectoReportanteId)) {
    return "No tienes permiso para realizar esta acción.";
  }
  return null;
}

export async function crearTag(formData: FormData): Promise<ResultadoCrearTag> {
  try {
    await exigirPermisoModulo("E", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const proyectoReportanteId = numeroEconomico ? null : String(formData.get("proyectoReportanteId") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const monto = parseFloat(String(formData.get("monto") ?? "0"));
  const caseta = String(formData.get("caseta") ?? "").trim() || null;
  const proveedorTag = String(formData.get("proveedorTag") ?? "");

  if (!fecha || !monto || !proveedorTag) {
    return { ok: false, error: "Fecha, monto y proveedor son obligatorios." };
  }

  const permitidos = await proyectosPermitidosParaModulo("E");
  const errorAsignacion = await validarAsignacion(numeroEconomico, proyectoReportanteId, permitidos);
  if (errorAsignacion) return { ok: false, error: errorAsignacion };

  const tag = await prisma.tag.create({
    data: { numeroEconomico, proyectoReportanteId, fecha: parseFechaLocalMx(fecha)!, monto, caseta, proveedorTag: proveedorTag as never },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "create",
      entidad: "Tag",
      entidadId: tag.id,
      detalle: { numeroEconomico, proyectoReportanteId, monto, caseta, proveedorTag },
    });
  }

  revalidatePath("/tag");
  invalidarCacheBI(["peajes"]);
  if (numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true };
}

export async function actualizarTag(formData: FormData): Promise<ResultadoCrearTag> {
  try {
    await exigirPermisoModulo("E", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "ID requerido." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const proyectoReportanteId = numeroEconomico ? null : String(formData.get("proyectoReportanteId") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const monto = parseFloat(String(formData.get("monto") ?? "0"));
  const caseta = String(formData.get("caseta") ?? "").trim() || null;
  const proveedorTag = String(formData.get("proveedorTag") ?? "");

  if (!fecha || !monto || !proveedorTag) {
    return { ok: false, error: "Fecha, monto y proveedor son obligatorios." };
  }

  const permitidos = await proyectosPermitidosParaModulo("E");
  const errorAsignacion = await validarAsignacion(numeroEconomico, proyectoReportanteId, permitidos);
  if (errorAsignacion) return { ok: false, error: errorAsignacion };

  const anterior = await prisma.tag.findUnique({ where: { id }, select: { numeroEconomico: true } });
  if (!anterior) return { ok: false, error: "El registro no existe." };
  if (permitidos !== null && anterior.numeroEconomico) {
    const unidadAnterior = await prisma.unidad.findUnique({ where: { numeroEconomico: anterior.numeroEconomico }, select: { proyectoId: true } });
    if (!unidadAnterior?.proyectoId || !permitidos.includes(unidadAnterior.proyectoId)) return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  await prisma.tag.update({
    where: { id },
    data: { numeroEconomico, proyectoReportanteId, fecha: parseFechaLocalMx(fecha)!, monto, caseta, proveedorTag: proveedorTag as never },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "update",
      entidad: "Tag",
      entidadId: id,
      detalle: { numeroEconomico, proyectoReportanteId, monto, caseta, proveedorTag },
    });
  }

  revalidatePath("/tag");
  invalidarCacheBI(["peajes"]);
  if (numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
  if (anterior.numeroEconomico && anterior.numeroEconomico !== numeroEconomico) revalidatePath(`/unidades/${anterior.numeroEconomico}`);
  return { ok: true };
}

export async function asignarEconomicoTag(formData: FormData) {
  await exigirPermisoModulo("E", "editar");

  const id = String(formData.get("id") ?? "");
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const proyectoReportanteId = numeroEconomico ? null : String(formData.get("proyectoReportanteId") ?? "") || null;
  if (!numeroEconomico && !proyectoReportanteId) throw new Error("Selecciona una unidad o un proyecto.");

  const permitidos = await proyectosPermitidosParaModulo("E");
  const errorAsignacion = await validarAsignacion(numeroEconomico, proyectoReportanteId, permitidos);
  if (errorAsignacion) throw new Error(errorAsignacion);

  await prisma.tag.update({ where: { id }, data: { numeroEconomico, proyectoReportanteId } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "update",
      entidad: "Tag",
      entidadId: id,
      detalle: numeroEconomico ? { campo: "numeroEconomico", nuevo: numeroEconomico } : { campo: "proyectoReportanteId", nuevo: proyectoReportanteId },
    });
  }

  revalidatePath("/tag");
  invalidarCacheBI(["peajes"]);
  if (numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
}
