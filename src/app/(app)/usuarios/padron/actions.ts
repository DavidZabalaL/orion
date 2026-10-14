"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { parsearWorkbook } from "@/lib/excel-parse";
import { elegirHojaPadron, extraerRegistrosPadron } from "@/lib/padron-personal";

export type ResultadoActualizarPadron = { ok: boolean; error?: string; total?: number; omitidas?: number };

export async function actualizarPadronPersonal(formData: FormData): Promise<ResultadoActualizarPadron> {
  await exigirPermisoModulo("K", "editar");

  const parseo = await parsearWorkbook(formData, "archivo", 20_000);
  if (!parseo.ok) return { ok: false, error: parseo.error };

  const hoja = elegirHojaPadron(parseo.hojas)!;
  const extraccion = extraerRegistrosPadron(hoja);
  if (!extraccion.ok) return { ok: false, error: extraccion.error };
  const { registros } = extraccion;
  const omitidas = extraccion.invalidas.length;

  if (registros.length === 0) {
    return { ok: false, error: "No se encontró ningún registro válido (con nombre y CURP) en el archivo." };
  }

  // Reemplazo completo: este padrón es una foto del personal activo al
  // momento de subir el archivo, no un histórico acumulable.
  await prisma.$transaction([
    prisma.personalActivo.deleteMany({}),
    prisma.personalActivo.createMany({ data: registros }),
  ]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "PersonalActivo",
      detalle: { total: registros.length, omitidas },
    });
  }

  revalidatePath("/usuarios/padron");
  return { ok: true, total: registros.length, omitidas };
}
