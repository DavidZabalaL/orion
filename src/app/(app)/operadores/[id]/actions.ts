"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";

export async function actualizarOperador(formData: FormData) {
  await exigirPermisoModulo("L", "editar");

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const curp = String(formData.get("curp") ?? "").trim().toUpperCase();
  const rfc = String(formData.get("rfc") ?? "").trim().toUpperCase() || null;
  const nss = String(formData.get("nss") ?? "").trim() || null;
  const tipoSangre = String(formData.get("tipoSangre") ?? "") || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const contactoEmergencia = String(formData.get("contactoEmergencia") ?? "").trim() || null;
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;

  if (!id || !nombre || !curp) {
    throw new Error("Nombre y CURP son obligatorios.");
  }

  const anterior = await prisma.operador.findUnique({ where: { id } });
  if (!anterior) throw new Error("El operador no existe.");

  const permitidos = await proyectosPermitidosParaModulo("L");
  if (permitidos !== null) {
    if (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
    if (proyectoId && !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para asignar ese proyecto.");
  }

  await prisma.operador.update({
    where: { id },
    data: {
      nombre,
      curp,
      rfc,
      nss,
      tipoSangre: (tipoSangre as never) || null,
      telefono,
      contactoEmergencia,
      proyectoId,
    },
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Operador",
        entidadId: id,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { nombre: anterior.nombre, curp: anterior.curp, proyectoId: anterior.proyectoId },
        valoresNuevos: { nombre, curp, proyectoId },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "operadores",
      accion: "update",
      entidad: "Operador",
      entidadId: id,
      detalle: { anterior: { nombre: anterior.nombre, curp: anterior.curp, proyectoId: anterior.proyectoId }, nuevo: { nombre, curp, proyectoId } },
    });
  }

  revalidatePath(`/operadores/${id}`);
  revalidatePath("/operadores");
  redirect(`/operadores/${id}`);
}
