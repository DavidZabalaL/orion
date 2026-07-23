"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { puedeEditarCapacidadTanque } from "@/lib/permisos";

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
