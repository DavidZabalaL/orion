"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque, tienePermisoModulo, exigirPermisoModulo } from "@/lib/permisos";
import { auth } from "@/auth";

export type ResultadoActualizarCapacidad = { ok: boolean; error?: string };

export async function actualizarCapacidadTanque(formData: FormData): Promise<ResultadoActualizarCapacidad> {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const capacidadTanqueLitros = parseFloat(String(formData.get("capacidadTanqueLitros") ?? ""));

  if (!(await puedeEditarCapacidadTanque())) {
    return { ok: false, error: "No tienes permiso para editar la capacidad de tanque." };
  }
  if (!numeroEconomico || !capacidadTanqueLitros || capacidadTanqueLitros <= 0) {
    return { ok: false, error: "Captura una capacidad válida, mayor a 0." };
  }

  await prisma.unidad.update({ where: { numeroEconomico }, data: { capacidadTanqueLitros } });
  revalidatePath(`/unidades/${numeroEconomico}`);
  return { ok: true };
}

export type ResultadoSimple = { ok: boolean; error?: string };

export async function reasignarProyecto(formData: FormData): Promise<ResultadoSimple> {
  if (!(await tienePermisoModulo("A", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;
  if (!numeroEconomico) return { ok: false, error: "Falta el número económico." };

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
  await prisma.unidad.update({ where: { numeroEconomico }, data: { proyectoId } });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { proyectoId: anterior?.proyectoId ?? null },
        valoresNuevos: { proyectoId },
      },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  revalidatePath("/unidades");
  return { ok: true };
}

export async function actualizarUnidad(formData: FormData) {
  await exigirPermisoModulo("A", "editar");

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  if (!numeroEconomico) throw new Error("Falta el número económico.");

  const placas = String(formData.get("placas") ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const marca = String(formData.get("marca") ?? "").trim();
  const unidadModelo = String(formData.get("unidadModelo") ?? "").trim();
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const tipoVehiculo = String(formData.get("tipoVehiculo") ?? "");
  const tipoCombustible = String(formData.get("tipoCombustible") ?? "");
  const rendimientoPromedio = formData.get("rendimientoPromedio") ? parseFloat(String(formData.get("rendimientoPromedio"))) : null;
  const capacidadTanqueLitros = formData.get("capacidadTanqueLitros") ? parseFloat(String(formData.get("capacidadTanqueLitros"))) : null;
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;
  const resguardanteId = String(formData.get("resguardanteId") ?? "") || null;
  const propietario = String(formData.get("propietario") ?? "");
  const origenPlaca = String(formData.get("origenPlaca") ?? "").trim();
  const tagIave = String(formData.get("tagIave") ?? "").trim() || null;

  if (!placas || !marca || !unidadModelo || !anio || !tipoVehiculo || !tipoCombustible || !propietario || !origenPlaca) {
    throw new Error("Faltan campos obligatorios.");
  }

  const dupPlacas = await prisma.unidad.findFirst({ where: { placas, NOT: { numeroEconomico } } });
  if (dupPlacas) throw new Error(`Las placas ${placas} ya están registradas en otra unidad.`);

  const anterior = await prisma.unidad.findUnique({ where: { numeroEconomico } });

  await prisma.unidad.update({
    where: { numeroEconomico },
    data: {
      placas,
      marca,
      unidadModelo,
      anio,
      tipoVehiculo: tipoVehiculo as never,
      tipoCombustible: tipoCombustible as never,
      rendimientoPromedio,
      capacidadTanqueLitros,
      proyectoId,
      resguardanteId,
      propietario: propietario as never,
      origenPlaca,
      tagIave,
    },
  });

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Unidad",
        entidadId: numeroEconomico,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: anterior ? { placas: anterior.placas, marca: anterior.marca, proyectoId: anterior.proyectoId } : undefined,
        valoresNuevos: { placas, marca, proyectoId },
      },
    });
  }

  revalidatePath(`/unidades/${numeroEconomico}`);
  revalidatePath("/unidades");
  redirect(`/unidades/${numeroEconomico}`);
}
