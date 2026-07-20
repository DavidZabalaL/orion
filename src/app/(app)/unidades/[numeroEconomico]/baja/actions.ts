"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function darDeBaja(numeroEconomico: string, formData: FormData) {
  const motivoBaja = String(formData.get("motivoBaja") ?? "");
  const fechaEfectiva = String(formData.get("fechaEfectiva") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!motivoBaja || !fechaEfectiva) {
    throw new Error("Motivo y fecha efectiva son obligatorios.");
  }

  const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico } });
  if (!unidad) throw new Error("Unidad no encontrada.");

  const ultimoGasto = await prisma.gastoVehicular.findFirst({
    where: { numeroEconomico },
    orderBy: { fecha: "desc" },
    select: { fecha: true },
  });
  if (ultimoGasto && new Date(fechaEfectiva) < ultimoGasto.fecha) {
    throw new Error("La fecha efectiva no puede ser anterior al último registro de gasto.");
  }

  await prisma.unidad.update({
    where: { numeroEconomico },
    data: {
      estatus: "BAJA",
      disponibilidad: false,
      proyectoId: null,
      fechaBaja: new Date(fechaEfectiva),
      motivoBaja: motivoBaja as never,
      comentarioBaja: comentario,
    },
  });

  await prisma.resguardo.updateMany({
    where: { numeroEconomico, fechaHasta: null },
    data: { fechaHasta: new Date(fechaEfectiva) },
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "DAR_DE_BAJA",
        valoresAnteriores: { estatus: unidad.estatus },
        valoresNuevos: { estatus: "BAJA", motivoBaja, fechaEfectiva },
      },
    });
  }

  redirect(`/unidades/${numeroEconomico}`);
}
