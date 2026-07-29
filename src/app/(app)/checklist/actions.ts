"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PUNTOS_INSPECCION } from "@/lib/checklist";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export async function crearChecklist(formData: FormData) {
  await exigirPermisoModulo("A.1", "editar");

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const odometro = parseInt(String(formData.get("odometro") ?? ""), 10);

  if (!numeroEconomico || !odometro) {
    throw new Error("Unidad y odómetro son obligatorios.");
  }

  const permitidos = await proyectosPermitidosParaModulo("A.1");
  if (permitidos !== null) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const puntosInspeccion: Record<string, string> = {};
  for (const p of PUNTOS_INSPECCION) {
    puntosInspeccion[p.key] = String(formData.get(`punto_${p.key}`) ?? "ok");
  }

  const session = await auth();
  if (!session?.user?.id) throw new Error("Sesión no válida.");

  await prisma.checklist.create({
    data: {
      numeroEconomico,
      fecha: new Date(),
      odometro,
      puntosInspeccion,
      capturadoPorId: session.user.id,
    },
  });

  revalidatePath("/checklist");
  revalidatePath(`/unidades/${numeroEconomico}`);
}
