// Lógica de escritura compartida por el registro manual de posición
// (src/app/(app)/mapa/actions.ts) y el cron de sincronización con Intellihub
// (src/app/api/cron/gps-intellihub/route.ts). Separado de src/lib/gps.ts para
// que evaluarAnomalia() se mantenga como función pura sin dependencia de Prisma.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { evaluarAnomalia } from "@/lib/gps";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import type { FuenteGPS } from "@/generated/prisma/enums";

export type RegistroPosicionInput = {
  numeroEconomico: string;
  lat: number;
  lng: number;
  velocidad: number | null;
  kmReportado: number | null;
  timestamp: Date;
  fuente: FuenteGPS;
};

export type RegistroPosicionResultado = {
  /** true si ya existía una posición igual o más reciente para esta unidad y no se insertó nada. */
  omitido: boolean;
  esAnomalo: boolean;
  huecoRegistrado: boolean;
  kmActualizado: boolean;
};

export async function registrarPosicionGPS(input: RegistroPosicionInput): Promise<RegistroPosicionResultado> {
  const { numeroEconomico, lat, lng, velocidad, kmReportado, timestamp, fuente } = input;

  const anterior = await prisma.posicionGPS.findFirst({
    where: { numeroEconomico },
    orderBy: { timestamp: "desc" },
  });

  // El polling puede repetir el mismo ping de GPS si la unidad no se ha movido
  // desde la última corrida — no tiene sentido duplicar la fila ni recalcular huecos.
  if (anterior && anterior.timestamp >= timestamp) {
    return { omitido: true, esAnomalo: false, huecoRegistrado: false, kmActualizado: false };
  }

  const { esAnomalo, motivo } = evaluarAnomalia(
    { lat, lng, timestamp },
    anterior ? { lat: Number(anterior.lat), lng: Number(anterior.lng), timestamp: anterior.timestamp } : null
  );

  await prisma.posicionGPS.create({
    data: {
      numeroEconomico,
      lat,
      lng,
      velocidad,
      timestamp,
      fuente,
      kmReportado,
      kmValidado: esAnomalo ? null : kmReportado,
      esAnomalo,
      motivoAnomalia: motivo,
    },
  });

  let huecoRegistrado = false;
  if (anterior) {
    const minutos = (timestamp.getTime() - anterior.timestamp.getTime()) / 60_000;
    if (minutos > 15) {
      await prisma.huecoSenalGPS.create({
        data: {
          numeroEconomico,
          ultimaPosicionLat: anterior.lat,
          ultimaPosicionLng: anterior.lng,
          timestampInicio: anterior.timestamp,
          timestampFin: timestamp,
          duracionMinutos: Math.round(minutos),
          primeraPosicionLat: lat,
          primeraPosicionLng: lng,
        },
      });
      huecoRegistrado = true;
    }
  }

  let kmActualizado = false;
  if (!esAnomalo && kmReportado) {
    await prisma.unidad.update({ where: { numeroEconomico }, data: { kmOficial: kmReportado } });
    kmActualizado = true;
  }

  revalidatePath("/mapa");
  revalidatePath("/mapa/integridad");
  revalidatePath(`/unidades/${numeroEconomico}`);
  invalidarCacheBI([
    "gps_posiciones",
    ...(huecoRegistrado ? ["gps_huecos_senal"] : []),
    ...(kmActualizado ? ["unidades"] : []),
  ]);

  return { omitido: false, esAnomalo, huecoRegistrado, kmActualizado };
}

export type ResultadoRegistroBatchGPS = {
  procesados: number;
  omitidos: number;
  anomalos: number;
};

/**
 * Misma lógica que registrarPosicionGPS(), pero para el cron de Intellihub:
 * en vez de un findFirst()+create()+update() POR unidad (con ~110 unidades,
 * eso eran cientos de round-trips secuenciales cada 10 minutos, todo el día —
 * la causa principal de que la base nunca lograra suspenderse y se agotara la
 * cuota de cómputo de Neon), resuelve la "última posición por unidad" en una
 * sola consulta y agrupa los inserts/updates en un puñado de queries batched.
 */
export async function registrarPosicionesGPSBatch(inputs: RegistroPosicionInput[]): Promise<ResultadoRegistroBatchGPS> {
  if (inputs.length === 0) return { procesados: 0, omitidos: 0, anomalos: 0 };

  const numerosEconomicos = inputs.map((i) => i.numeroEconomico);
  const ultimas = await prisma.$queryRaw<{ numeroEconomico: string; lat: Prisma.Decimal; lng: Prisma.Decimal; timestamp: Date }[]>(
    Prisma.sql`
      SELECT DISTINCT ON ("numeroEconomico") "numeroEconomico", lat, lng, timestamp
      FROM "PosicionGPS"
      WHERE "numeroEconomico" IN (${Prisma.join(numerosEconomicos)})
      ORDER BY "numeroEconomico", timestamp DESC
    `
  );
  const anteriorPorUnidad = new Map(ultimas.map((u) => [u.numeroEconomico, u]));

  const posicionesACrear: Prisma.PosicionGPSCreateManyInput[] = [];
  const huecosACrear: Prisma.HuecoSenalGPSCreateManyInput[] = [];
  const kmActualizaciones: { numeroEconomico: string; km: number }[] = [];
  const rutasParaRevalidar = new Set<string>();
  let omitidos = 0;
  let anomalos = 0;

  for (const input of inputs) {
    const { numeroEconomico, lat, lng, velocidad, kmReportado, timestamp, fuente } = input;
    const anterior = anteriorPorUnidad.get(numeroEconomico);

    if (anterior && anterior.timestamp >= timestamp) {
      omitidos++;
      continue;
    }

    const { esAnomalo, motivo } = evaluarAnomalia(
      { lat, lng, timestamp },
      anterior ? { lat: Number(anterior.lat), lng: Number(anterior.lng), timestamp: anterior.timestamp } : null
    );
    if (esAnomalo) anomalos++;

    posicionesACrear.push({
      numeroEconomico,
      lat,
      lng,
      velocidad,
      timestamp,
      fuente,
      kmReportado,
      kmValidado: esAnomalo ? null : kmReportado,
      esAnomalo,
      motivoAnomalia: motivo,
    });

    if (anterior) {
      const minutos = (timestamp.getTime() - anterior.timestamp.getTime()) / 60_000;
      if (minutos > 15) {
        huecosACrear.push({
          numeroEconomico,
          ultimaPosicionLat: anterior.lat,
          ultimaPosicionLng: anterior.lng,
          timestampInicio: anterior.timestamp,
          timestampFin: timestamp,
          duracionMinutos: Math.round(minutos),
          primeraPosicionLat: lat,
          primeraPosicionLng: lng,
        });
      }
    }

    if (!esAnomalo && kmReportado) kmActualizaciones.push({ numeroEconomico, km: kmReportado });
    rutasParaRevalidar.add(numeroEconomico);
  }

  if (posicionesACrear.length > 0) await prisma.posicionGPS.createMany({ data: posicionesACrear });
  if (huecosACrear.length > 0) await prisma.huecoSenalGPS.createMany({ data: huecosACrear });
  if (kmActualizaciones.length > 0) {
    // Un solo UPDATE para todas las unidades — Prisma no tiene un "bulk update"
    // con valores distintos por fila en su API normal.
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "Unidad" AS u
      SET "kmOficial" = c.km
      FROM (VALUES ${Prisma.join(
        kmActualizaciones.map((k) => Prisma.sql`(${k.numeroEconomico}, ${k.km})`)
      )}) AS c("numeroEconomico", km)
      WHERE u."numeroEconomico" = c."numeroEconomico"
    `);
  }

  if (rutasParaRevalidar.size > 0) {
    revalidatePath("/mapa");
    revalidatePath("/mapa/integridad");
    for (const numeroEconomico of rutasParaRevalidar) revalidatePath(`/unidades/${numeroEconomico}`);
    invalidarCacheBI([
      "gps_posiciones",
      ...(huecosACrear.length > 0 ? ["gps_huecos_senal"] : []),
      ...(kmActualizaciones.length > 0 ? ["unidades"] : []),
    ]);
  }

  return { procesados: posicionesACrear.length, omitidos, anomalos };
}
