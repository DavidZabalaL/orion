// Lógica de escritura compartida por el registro manual de posición
// (src/app/(app)/mapa/actions.ts) y el cron de sincronización con Intellihub
// (src/app/api/cron/gps-intellihub/route.ts). Separado de src/lib/gps.ts para
// que evaluarAnomalia() se mantenga como función pura sin dependencia de Prisma.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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
