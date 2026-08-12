"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";

export async function resolverAuditoria(formData: FormData) {
  await exigirPermisoModulo("I", "aprobar");

  const id = String(formData.get("id") ?? "");
  const resolucion = String(formData.get("resolucion") ?? "").trim();

  if (!id || !resolucion) throw new Error("La resolución es obligatoria.");

  const permitidos = await proyectosPermitidosParaModulo("I");
  if (permitidos !== null) {
    const actual = await prisma.auditoria.findUnique({ where: { id }, select: { unidad: { select: { proyectoId: true } } } });
    if (!actual?.unidad.proyectoId || !permitidos.includes(actual.unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const auditoria = await prisma.auditoria.update({
    where: { id },
    data: { estatus: "RESUELTA", resolucion },
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Auditoria",
        entidadId: auditoria.id,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { estatus: "ABIERTA" },
        valoresNuevos: { estatus: "RESUELTA", resolucion },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "auditoria",
      accion: "update",
      entidad: "Auditoria",
      entidadId: auditoria.id,
      detalle: { estatus: "RESUELTA", resolucion },
    });
  }

  revalidatePath("/auditoria");
}
