"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function invitarUsuario(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const rolId = String(formData.get("rolId") ?? "");
  const proyectoIds = formData.getAll("proyectoIds").map(String);

  if (!nombre || !correo || !rolId) {
    throw new Error("Nombre, correo y rol son obligatorios.");
  }

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      correo,
      rolId,
      estatus: "INVITADO",
      proyectos: { create: proyectoIds.map((proyectoId) => ({ proyectoId })) },
    },
  });

  revalidatePath("/usuarios");
  return usuario.id;
}

export async function alternarEstatusUsuario(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const estatusActual = String(formData.get("estatus") ?? "");
  const nuevoEstatus = estatusActual === "DESACTIVADO" ? "ACTIVO" : "DESACTIVADO";
  await prisma.usuario.update({ where: { id }, data: { estatus: nuevoEstatus } });
  revalidatePath("/usuarios");
}

export async function actualizarPermisosRol(formData: FormData) {
  const rolId = String(formData.get("rolId") ?? "");
  const modulos = String(formData.get("modulos") ?? "").split(",");

  const permisos: Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> = {};
  for (const modulo of modulos) {
    const nivel = String(formData.get(`permiso_${modulo}`) ?? "ninguno");
    if (nivel === "ver") permisos[modulo] = { ver: true };
    else if (nivel === "editar") permisos[modulo] = { ver: true, editar: true };
    else if (nivel === "aprobar") permisos[modulo] = { ver: true, editar: true, aprobar: true };
  }

  await prisma.rol.update({ where: { id: rolId }, data: { permisos } });
  revalidatePath("/usuarios/roles");
}

export async function actualizarModulosProyecto(formData: FormData) {
  const proyectoId = String(formData.get("proyectoId") ?? "");
  const modulosActivos = formData.getAll("modulosActivos").map(String);
  await prisma.proyecto.update({ where: { id: proyectoId }, data: { modulosActivos } });
  revalidatePath("/usuarios/proyectos");
}
