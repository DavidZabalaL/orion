"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { PUNTOS_INSPECCION } from "@/lib/checklist";

export async function crearChecklist(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const odometro = parseInt(String(formData.get("odometro") ?? ""), 10);

  if (!numeroEconomico || !odometro) {
    throw new Error("Unidad y odómetro son obligatorios.");
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
