"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { registrarCambioDisponibilidad } from "@/lib/sla-disponibilidad";
import { registrarCambioResguardante } from "@/lib/resguardo";
import { parseFechaLocalMx } from "@/lib/timezone";

export async function darDeBaja(numeroEconomico: string, formData: FormData) {
  await exigirPermisoModulo("B", "editar");

  const motivoBaja = String(formData.get("motivoBaja") ?? "");
  const fechaEfectiva = String(formData.get("fechaEfectiva") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim() || null;

  if (!motivoBaja || !fechaEfectiva) {
    throw new Error("Motivo y fecha efectiva son obligatorios.");
  }
  const fechaEfectivaDate = parseFechaLocalMx(fechaEfectiva)!;

  const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico } });
  if (!unidad) throw new Error("Unidad no encontrada.");

  const permitidos = await proyectosPermitidosParaModulo("B");
  if (permitidos !== null && (!unidad.proyectoId || !permitidos.includes(unidad.proyectoId))) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }

  const ultimoGasto = await prisma.gastoVehicular.findFirst({
    where: { numeroEconomico },
    orderBy: { fecha: "desc" },
    select: { fecha: true },
  });
  if (ultimoGasto && fechaEfectivaDate < ultimoGasto.fecha) {
    throw new Error("La fecha efectiva no puede ser anterior al último registro de gasto.");
  }

  await prisma.unidad.update({
    where: { numeroEconomico },
    data: {
      estatus: "BAJA",
      disponibilidad: false,
      fechaCambioDisponibilidad: fechaEfectivaDate,
      proyectoId: null,
      fechaBaja: fechaEfectivaDate,
      motivoBaja: motivoBaja as never,
      comentarioBaja: comentario,
    },
  });

  await registrarCambioResguardante(numeroEconomico, null, fechaEfectivaDate, "Baja de unidad");

  await registrarCambioDisponibilidad(numeroEconomico, false, fechaEfectivaDate);

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
    await logActivity({
      userId: session.user.id,
      modulo: "vehiculos",
      accion: "update",
      entidad: "Unidad",
      entidadId: numeroEconomico,
      detalle: { campo: "estatus", anterior: unidad.estatus, nuevo: "BAJA", motivoBaja },
    });
  }

  invalidarCacheBI(["unidades"]);
  redirect(`/unidades/${numeroEconomico}`);
}
