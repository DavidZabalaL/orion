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

export async function crearTag(formData: FormData): Promise<ResultadoCrearTag> {
  try {
    await exigirPermisoModulo("E", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const monto = parseFloat(String(formData.get("monto") ?? "0"));
  const caseta = String(formData.get("caseta") ?? "").trim() || null;
  const proveedorTag = String(formData.get("proveedorTag") ?? "");

  if (!fecha || !monto || !proveedorTag) {
    return { ok: false, error: "Fecha, monto y proveedor son obligatorios." };
  }

  const permitidos = await proyectosPermitidosParaModulo("E");
  if (permitidos !== null && numeroEconomico) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const tag = await prisma.tag.create({
    data: { numeroEconomico, fecha: parseFechaLocalMx(fecha)!, monto, caseta, proveedorTag: proveedorTag as never },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "create",
      entidad: "Tag",
      entidadId: tag.id,
      detalle: { numeroEconomico, monto, caseta, proveedorTag },
    });
  }

  revalidatePath("/tag");
  invalidarCacheBI(["peajes"]);
  if (numeroEconomico) revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true };
}

export async function asignarEconomicoTag(formData: FormData) {
  await exigirPermisoModulo("E", "editar");

  const id = String(formData.get("id") ?? "");
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  if (!numeroEconomico) throw new Error("Selecciona una unidad.");

  const permitidos = await proyectosPermitidosParaModulo("E");
  if (permitidos !== null) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  await prisma.tag.update({ where: { id }, data: { numeroEconomico } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "tag",
      accion: "update",
      entidad: "Tag",
      entidadId: id,
      detalle: { campo: "numeroEconomico", nuevo: numeroEconomico },
    });
  }

  revalidatePath("/tag");
  invalidarCacheBI(["peajes"]);
}
