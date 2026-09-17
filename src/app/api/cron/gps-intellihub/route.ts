// Sincronización periódica de posición GPS contra la Intellihub API (Forward
// Thinking Systems), módulo G. Disparado por Vercel Cron (ver vercel.json).
// No existe webhook del lado de Intellihub — todo es polling: se pide el
// estatus de toda la flota en una sola llamada y se cruza por
// Unidad.intellihubVehicleId (ver prisma/schema.prisma). Las unidades sin ese
// campo (sin GPS dado de alta todavía) se omiten, no son un error.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstatusVehiculos, mphAKmh, millasAKm } from "@/lib/intellihub";
import { registrarPosicionGPS } from "@/lib/gps-registro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const secreto = process.env.CRON_SECRET;
  if (secreto) {
    const encabezado = request.headers.get("authorization");
    if (encabezado !== `Bearer ${secreto}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
  }

  const unidades = await prisma.unidad.findMany({
    where: { intellihubVehicleId: { not: null } },
    select: { numeroEconomico: true, intellihubVehicleId: true },
  });
  const porVehicleId = new Map(unidades.map((u) => [u.intellihubVehicleId as number, u.numeroEconomico]));

  if (porVehicleId.size === 0) {
    return NextResponse.json({ omitido: "Ninguna unidad tiene intellihubVehicleId asignado." });
  }

  const estatus = await obtenerEstatusVehiculos();

  let procesados = 0;
  let omitidosSinMapeo = 0;
  let omitidosSinPosicion = 0;
  let omitidosNoMasRecientes = 0;
  let anomalos = 0;
  const errores: { numeroEconomico: string; error: string }[] = [];

  for (const v of estatus) {
    const numeroEconomico = porVehicleId.get(v.vehicleId);
    if (!numeroEconomico) {
      omitidosSinMapeo++;
      continue;
    }

    if (v.lat == null || v.lon == null || !v.lastupdate) {
      omitidosSinPosicion++;
      continue;
    }

    try {
      const resultado = await registrarPosicionGPS({
        numeroEconomico,
        lat: v.lat,
        lng: v.lon,
        velocidad: v.velocity != null ? mphAKmh(v.velocity) : null,
        kmReportado: v.odometer != null ? Math.round(millasAKm(v.odometer)) : null,
        timestamp: new Date(v.lastupdate),
        fuente: "API",
      });

      if (resultado.omitido) omitidosNoMasRecientes++;
      else {
        procesados++;
        if (resultado.esAnomalo) anomalos++;
      }
    } catch (error) {
      errores.push({ numeroEconomico, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return NextResponse.json({
    totalIntellihub: estatus.length,
    unidadesMapeadas: porVehicleId.size,
    procesados,
    anomalos,
    omitidosSinMapeo,
    omitidosSinPosicion,
    omitidosNoMasRecientes,
    errores,
  });
}
