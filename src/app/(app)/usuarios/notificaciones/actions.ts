"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";

function parseDias(v: FormDataEntryValue | null) {
  return String(v ?? "")
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => !isNaN(n));
}

export async function actualizarConfiguracionNotificaciones(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const id = String(formData.get("id") ?? "");

  const data = {
    alertaGpsSinSenalHoras: parseInt(String(formData.get("alertaGpsSinSenalHoras") ?? "48"), 10),
    alertaGpsSinSenalActiva: formData.get("alertaGpsSinSenalActiva") === "on",

    alertaMantenimientoDiasPrevios: parseDias(formData.get("alertaMantenimientoDiasPrevios")),
    alertaMantenimientoActiva: formData.get("alertaMantenimientoActiva") === "on",

    alertaRendimientoUmbralPct: parseInt(String(formData.get("alertaRendimientoUmbralPct") ?? "20"), 10),
    alertaRendimientoActiva: formData.get("alertaRendimientoActiva") === "on",

    alertaSeguroDiasPrevios: parseDias(formData.get("alertaSeguroDiasPrevios")),
    alertaSeguroActiva: formData.get("alertaSeguroActiva") === "on",

    alertaSenalPerdidaMinutos: parseInt(String(formData.get("alertaSenalPerdidaMinutos") ?? "15"), 10),
    alertaSenalPerdidaActiva: formData.get("alertaSenalPerdidaActiva") === "on",

    alertaChecklistFaltanteActiva: formData.get("alertaChecklistFaltanteActiva") === "on",
    alertaChecklistHoraLimite: String(formData.get("alertaChecklistHoraLimite") ?? "18:00"),

    alertaDocumentoOperadorDiasPrevios: parseDias(formData.get("alertaDocumentoOperadorDiasPrevios")),
    alertaDocumentoOperadorActiva: formData.get("alertaDocumentoOperadorActiva") === "on",

    alertaRecargaPresupuestoActiva: formData.get("alertaRecargaPresupuestoActiva") === "on",

    destinatariosCorreo: String(formData.get("destinatariosCorreo") ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  };

  const config = id
    ? await prisma.configuracionNotificaciones.update({ where: { id }, data })
    : await prisma.configuracionNotificaciones.create({ data });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "ConfiguracionNotificaciones",
      entidadId: config.id,
    });
  }

  revalidatePath("/usuarios/notificaciones");
}

export async function actualizarNotificacionRescateProyecto(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const proyectoId = String(formData.get("proyectoId") ?? "");
  if (!proyectoId) throw new Error("Selecciona un proyecto.");

  const destinatarios = String(formData.get("destinatariosRescate") ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const session = await auth();

  await prisma.configuracionNotificacionProyecto.upsert({
    where: { proyectoId },
    create: { proyectoId, destinatariosRescate: destinatarios, actualizadoPorId: session?.user?.id },
    update: { destinatariosRescate: destinatarios, actualizadoPorId: session?.user?.id },
  });

  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "ConfiguracionNotificacionProyecto",
      entidadId: proyectoId,
      detalle: { destinatarios },
    });
  }

  revalidatePath("/usuarios/notificaciones");
}
