"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function parseDias(v: FormDataEntryValue | null) {
  return String(v ?? "")
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => !isNaN(n));
}

export async function actualizarConfiguracionNotificaciones(formData: FormData) {
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

    destinatariosCorreo: String(formData.get("destinatariosCorreo") ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  };

  if (id) {
    await prisma.configuracionNotificaciones.update({ where: { id }, data });
  } else {
    await prisma.configuracionNotificaciones.create({ data });
  }

  revalidatePath("/usuarios/notificaciones");
}
