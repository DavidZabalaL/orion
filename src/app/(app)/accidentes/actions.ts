"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

export async function registrarAccidente(
  formData: FormData
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("A", "editar");

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const numeroEconomico = String(formData.get("numeroEconomico") ?? "").trim();
    const operadorId = String(formData.get("operadorId") ?? "").trim() || null;
    const fecha = String(formData.get("fecha") ?? "").trim();
    const tipo = String(formData.get("tipo") ?? "").trim();
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const evidencias = formData.getAll("evidencias").map((v) => String(v)).filter(Boolean);

    if (!numeroEconomico || !fecha || !tipo || !descripcion) {
      return { ok: false, error: "Unidad, fecha, tipo y descripción son obligatorios." };
    }

    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad) return { ok: false, error: "La unidad no existe." };

    const accidente = await prisma.accidente.create({
      data: {
        fecha: new Date(fecha),
        tipo,
        descripcion,
        numeroEconomico,
        operadorId: operadorId || undefined,
        evidencias,
        registradoPorId: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      modulo: "accidentes",
      accion: "create",
      entidad: "Accidente",
      entidadId: accidente.id,
      detalle: { numeroEconomico, operadorId, tipo },
    });

    revalidatePath(`/unidades/${numeroEconomico}`);
    if (operadorId) revalidatePath(`/operadores/${operadorId}`);
    invalidarCacheBI(["accidentes"]);
    return { ok: true, id: accidente.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo registrar el accidente." };
  }
}

export async function registrarCurso(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("L", "editar");

    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const operadorId = String(formData.get("operadorId") ?? "").trim();
    const nombre = String(formData.get("nombre") ?? "").trim();
    const fecha = String(formData.get("fecha") ?? "").trim();
    const evidenciaUrl = String(formData.get("evidenciaUrl") ?? "").trim() || null;

    if (!operadorId || !nombre || !fecha) {
      return { ok: false, error: "Operador, nombre del curso y fecha son obligatorios." };
    }

    await prisma.cursoOperador.create({
      data: {
        operadorId,
        nombre,
        fecha: new Date(fecha),
        evidenciaUrl: evidenciaUrl || undefined,
      },
    });

    await prisma.operador.update({
      where: { id: operadorId },
      data: { fechaUltimaCapacitacion: new Date(fecha) } as never,
    });

    await logActivity({
      userId: session.user.id,
      modulo: "operadores",
      accion: "update",
      entidad: "Operador",
      entidadId: operadorId,
      detalle: { accion: "curso_agregado", nombre, fecha },
    });

    revalidatePath(`/operadores/${operadorId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo registrar el curso." };
  }
}
