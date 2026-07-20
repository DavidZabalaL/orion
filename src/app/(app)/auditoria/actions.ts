"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function resolverAuditoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const resolucion = String(formData.get("resolucion") ?? "").trim();

  if (!id || !resolucion) throw new Error("La resolución es obligatoria.");

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
  }

  revalidatePath("/auditoria");
}
