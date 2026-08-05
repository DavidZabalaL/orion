"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { esDevAdmin } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";

export type ResultadoCerrarSesion = { ok: boolean; error?: string };

/**
 * Fuerza el cierre de sesión de un usuario: cualquier JWT que ya tenga en el
 * navegador deja de ser válido en la próxima petición (ver el callback
 * `session` en src/auth.ts). No cambia su estatus de cuenta — puede iniciar
 * sesión de nuevo de inmediato, a diferencia de desactivarlo.
 */
export async function forzarCierreSesion(formData: FormData): Promise<ResultadoCerrarSesion> {
  if (!(await esDevAdmin())) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  const usuarioId = String(formData.get("usuarioId") ?? "");
  if (!usuarioId) return { ok: false, error: "Usuario inválido." };

  try {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { sesionInvalidadaEn: new Date() } });
  } catch {
    return { ok: false, error: "No se pudo cerrar la sesión." };
  }

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "forzar_logout",
      entidad: "Usuario",
      entidadId: usuarioId,
    });
  }

  revalidatePath("/admin/actividad");
  revalidatePath(`/admin/actividad/usuarios/${usuarioId}`);
  return { ok: true };
}
