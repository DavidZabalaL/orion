"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export async function crearTag(formData: FormData) {
  await exigirPermisoModulo("E", "editar");

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const monto = parseFloat(String(formData.get("monto") ?? "0"));
  const caseta = String(formData.get("caseta") ?? "").trim() || null;
  const proveedorTag = String(formData.get("proveedorTag") ?? "");

  if (!fecha || !monto || !proveedorTag) {
    throw new Error("Fecha, monto y proveedor son obligatorios.");
  }

  const permitidos = await proyectosPermitidosParaModulo("E");
  if (permitidos !== null && numeroEconomico) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  await prisma.tag.create({
    data: { numeroEconomico, fecha: new Date(fecha), monto, caseta, proveedorTag: proveedorTag as never, conciliado: false },
  });

  revalidatePath("/tag");
}

export async function conciliarTag(formData: FormData) {
  await exigirPermisoModulo("E", "aprobar");

  const id = String(formData.get("id") ?? "");

  const permitidos = await proyectosPermitidosParaModulo("E");
  if (permitidos !== null) {
    const tag = await prisma.tag.findUnique({ where: { id }, select: { proyectoReportanteId: true, unidad: { select: { proyectoId: true } } } });
    const proyectoId = tag?.unidad?.proyectoId ?? tag?.proyectoReportanteId ?? null;
    if (!proyectoId || !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  await prisma.tag.update({ where: { id }, data: { conciliado: true } });
  revalidatePath("/tag");
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
  revalidatePath("/tag");
}
