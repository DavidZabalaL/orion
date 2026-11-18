// Sincronización periódica de posición GPS contra la Intellihub API (Forward
// Thinking Systems), módulo G. Disparado por Vercel Cron (ver vercel.json).
// No existe webhook del lado de Intellihub — todo es polling: se pide el
// estatus de toda la flota en una sola llamada y se cruza por
// Unidad.intellihubVehicleId (ver prisma/schema.prisma). Las unidades sin ese
// campo se emparejan por nombre si ya existen en Intellihub (emparejarPorNombre);
// si no (sin GPS dado de alta todavía), se omiten, no son un error.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerEstatusVehiculos, mphAKmh, millasAKm, emparejarPorNombre } from "@/lib/intellihub";
import { registrarPosicionesGPSBatch, type RegistroPosicionInput } from "@/lib/gps-registro";
import { bearerAutorizado } from "@/lib/secreto";
import { recalcularKmOficial, asegurarBaseAnual } from "@/lib/km-oficial-datos";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  // Falla cerrado: sin CRON_SECRET configurado se rechaza todo.
  if (!bearerAutorizado(request, "CRON_SECRET")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const unidades = await prisma.unidad.findMany({ select: { numeroEconomico: true, intellihubVehicleId: true, estatus: true } });
  const porVehicleId = new Map(unidades.filter((u) => u.intellihubVehicleId != null).map((u) => [u.intellihubVehicleId as number, u.numeroEconomico]));

  const estatus = await obtenerEstatusVehiculos();

  // Unidades dadas de alta después del mapeo inicial (ej. CP-004/CP-005): nadie
  // les capturaba el vehicleId y el cron las omitía para siempre. Se emparejan
  // solas por el económico del nombre en Intellihub; casi siempre son 0 updates.
  const sinGps = unidades.filter((u) => u.intellihubVehicleId == null && u.estatus !== "BAJA").map((u) => u.numeroEconomico);
  const nuevos = emparejarPorNombre(estatus, new Set(porVehicleId.keys()), sinGps);
  for (const { vehicleId, numeroEconomico } of nuevos) {
    await prisma.unidad.update({ where: { numeroEconomico }, data: { intellihubVehicleId: vehicleId } });
    porVehicleId.set(vehicleId, numeroEconomico);
  }

  if (porVehicleId.size === 0) {
    return NextResponse.json({ omitido: "Ninguna unidad tiene intellihubVehicleId asignado." });
  }

  let omitidosSinMapeo = 0;
  let omitidosSinPosicion = 0;
  const inputs: RegistroPosicionInput[] = [];

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

    inputs.push({
      numeroEconomico,
      lat: v.lat,
      lng: v.lon,
      velocidad: v.velocity != null ? mphAKmh(v.velocity) : null,
      kmReportado: v.odometer != null ? Math.round(millasAKm(v.odometer)) : null,
      timestamp: new Date(v.lastupdate),
      fuente: "API",
    });
  }

  try {
    const { procesados, omitidos: omitidosNoMasRecientes, anomalos } = await registrarPosicionesGPSBatch(inputs);
    const kmOficial = await actualizarKmOficial(unidades.filter((u) => u.estatus !== "BAJA").map((u) => u.numeroEconomico));

    return NextResponse.json({
      totalIntellihub: estatus.length,
      unidadesMapeadas: porVehicleId.size,
      mapeadasPorNombre: nuevos.map((n) => n.numeroEconomico),
      procesados,
      anomalos,
      omitidosSinMapeo,
      omitidosSinPosicion,
      omitidosNoMasRecientes,
      kmOficial,
    });
  } catch (error) {
    // Antes cada unidad se registraba por separado, así que una fila con datos
    // raros solo tumbaba esa unidad. Ahora el registro va en un solo batch, así
    // que un error aquí puede tumbar la corrida completa — se reporta explícito
    // en vez de un 500 genérico, para poder diagnosticarlo en los logs del cron.
    console.error("cron gps-intellihub: fallo al registrar el batch", error);
    return NextResponse.json(
      { error: "No se pudo registrar el batch de posiciones GPS.", detalle: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Km oficial de toda la flota con la regla triangulada (src/lib/km-oficial.ts):
 * aquí entra también el km de checklists y cargas nuevas, no solo el de las
 * unidades con GPS. Después, la base del año si falta (KmBaseAnual). Un fallo
 * no tumba el registro de posiciones (ya guardado).
 */
async function actualizarKmOficial(numeros: string[]): Promise<{ actualizados: number; basesCreadas: number } | string> {
  try {
    const { cambios } = await recalcularKmOficial(numeros, true);
    if (cambios.length > 0) invalidarCacheBI(["unidades"]);
    return { actualizados: cambios.length, basesCreadas: await asegurarBaseAnual() };
  } catch (error) {
    console.error("cron gps-intellihub: fallo al recalcular kmOficial", error);
    return error instanceof Error ? error.message : String(error);
  }
}
