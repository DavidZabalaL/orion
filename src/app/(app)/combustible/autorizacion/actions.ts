"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";

export async function crearSolicitudAutorizacion(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("D", "editar");
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const proyectoId = String(formData.get("proyectoId") ?? "").trim();
    const monto = parseFloat(String(formData.get("monto") ?? ""));
    const litros = parseFloat(String(formData.get("litros") ?? "")) || undefined;
    const motivo = String(formData.get("motivo") ?? "").trim();
    const excedente = parseFloat(String(formData.get("excedente") ?? "")) || undefined;
    const periodoPresupuesto = String(formData.get("periodoPresupuesto") ?? "").trim() || undefined;
    const numeroEconomico = String(formData.get("numeroEconomico") ?? "").trim() || undefined;

    if (!proyectoId) return { ok: false, error: "Proyecto requerido." };
    if (!motivo) return { ok: false, error: "Motivo requerido." };
    if (!monto || isNaN(monto) || monto <= 0) return { ok: false, error: "Monto inválido." };

    const solicitud = await prisma.solicitudAutorizacionCombustible.create({
      data: {
        proyectoId,
        monto,
        litros,
        motivo,
        excedente,
        periodoPresupuesto,
        numeroEconomico,
        solicitadoPorId: session.user.id,
      },
    });

    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "create",
      entidad: "SolicitudAutorizacionCombustible",
      entidadId: solicitud.id,
      detalle: { proyectoId, monto, litros, motivo },
    });

    revalidatePath("/combustible/autorizacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo crear la solicitud." };
  }
}

export async function responderSolicitud(
  id: string,
  estatus: "APROBADA" | "RECHAZADA",
  observaciones: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await exigirPermisoModulo("D", "editar");
    const session = await auth();
    if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

    const solicitud = await prisma.solicitudAutorizacionCombustible.findUnique({ where: { id } });
    if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };
    if (solicitud.estatus !== "PENDIENTE") return { ok: false, error: "La solicitud ya fue respondida." };

    await prisma.solicitudAutorizacionCombustible.update({
      where: { id },
      data: {
        estatus,
        aprobadoPorId: session.user.id,
        fechaRespuesta: new Date(),
        observacionesAprobador: observaciones || null,
      },
    });

    await logActivity({
      userId: session.user.id,
      modulo: "combustible",
      accion: "edit",
      entidad: "SolicitudAutorizacionCombustible",
      entidadId: id,
      detalle: { estatus, observaciones },
    });

    revalidatePath("/combustible/autorizacion");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo actualizar la solicitud." };
  }
}
