"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { evaluarAnomalia } from "@/lib/gps";

export async function registrarPosicion(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  const lat = parseFloat(String(formData.get("lat") ?? ""));
  const lng = parseFloat(String(formData.get("lng") ?? ""));
  const velocidad = formData.get("velocidad") ? parseFloat(String(formData.get("velocidad"))) : null;
  const kmReportado = formData.get("kmReportado") ? parseInt(String(formData.get("kmReportado")), 10) : null;
  const timestamp = String(formData.get("timestamp") ?? "");

  if (!numeroEconomico || isNaN(lat) || isNaN(lng) || !timestamp) {
    throw new Error("Unidad, coordenadas y fecha/hora son obligatorias.");
  }

  const fechaPunto = new Date(timestamp);

  const anterior = await prisma.posicionGPS.findFirst({
    where: { numeroEconomico },
    orderBy: { timestamp: "desc" },
  });

  const { esAnomalo, motivo } = evaluarAnomalia(
    { lat, lng, timestamp: fechaPunto },
    anterior ? { lat: Number(anterior.lat), lng: Number(anterior.lng), timestamp: anterior.timestamp } : null
  );

  await prisma.posicionGPS.create({
    data: {
      numeroEconomico,
      lat,
      lng,
      velocidad,
      timestamp: fechaPunto,
      fuente: "API",
      kmReportado,
      kmValidado: esAnomalo ? null : kmReportado,
      esAnomalo,
      motivoAnomalia: motivo,
    },
  });

  if (anterior) {
    const minutos = (fechaPunto.getTime() - anterior.timestamp.getTime()) / 60_000;
    if (minutos > 15) {
      await prisma.huecoSenalGPS.create({
        data: {
          numeroEconomico,
          ultimaPosicionLat: anterior.lat,
          ultimaPosicionLng: anterior.lng,
          timestampInicio: anterior.timestamp,
          timestampFin: fechaPunto,
          duracionMinutos: Math.round(minutos),
          primeraPosicionLat: lat,
          primeraPosicionLng: lng,
        },
      });
    }
  }

  if (!esAnomalo && kmReportado) {
    await prisma.unidad.update({ where: { numeroEconomico }, data: { kmOficial: kmReportado } });
  }

  revalidatePath("/mapa");
  revalidatePath("/mapa/integridad");
  revalidatePath(`/unidades/${numeroEconomico}`);
}
