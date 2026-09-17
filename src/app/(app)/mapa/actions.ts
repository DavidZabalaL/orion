"use server";

import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { registrarPosicionGPS } from "@/lib/gps-registro";

export async function registrarPosicion(formData: FormData) {
  await exigirPermisoModulo("G", "editar");

  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));
  const velocidad = formData.get("velocidad") ? parseFloat(String(formData.get("velocidad"))) : null;
  const kmReportado = formData.get("kmReportado") ? parseInt(String(formData.get("kmReportado")), 10) : null;
  const timestamp = String(formData.get("timestamp") ?? "");

  if (!numeroEconomico || isNaN(lat) || isNaN(lng) || !timestamp) {
    throw new Error("Unidad, coordenadas y fecha/hora son obligatorias.");
  }

  const permitidos = await proyectosPermitidosParaModulo("G");
  if (permitidos !== null) {
    const unidad = await prisma.unidad.findUnique({ where: { numeroEconomico }, select: { proyectoId: true } });
    if (!unidad?.proyectoId || !permitidos.includes(unidad.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
  }

  const fechaPunto = new Date(timestamp);

  const resultado = await registrarPosicionGPS({
    numeroEconomico,
    lat,
    lng,
    velocidad,
    kmReportado,
    timestamp: fechaPunto,
    fuente: "API",
  });

  const session = await auth();
  if (session?.user?.id && !resultado.omitido) {
    await logActivity({
      userId: session.user.id,
      modulo: "mapa",
      accion: "create",
      entidad: "PosicionGPS",
      entidadId: numeroEconomico,
      detalle: { lat, lng, esAnomalo: resultado.esAnomalo },
    });
  }
}
