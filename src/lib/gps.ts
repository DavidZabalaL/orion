// Límites aproximados del territorio mexicano — Capa 1, filtro "fuera de país" (Módulo G.1).
const MEXICO_BOUNDS = { latMin: 14.0, latMax: 33.0, lngMin: -118.5, lngMax: -86.0 };
const VELOCIDAD_MAXIMA_KMH = 180;
const SALTO_DISTANCIA_KM = 300;

function distanciaHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export type PuntoAnterior = { lat: number; lng: number; timestamp: Date } | null;

export function evaluarAnomalia(
  punto: { lat: number; lng: number; timestamp: Date },
  anterior: PuntoAnterior
): { esAnomalo: boolean; motivo: "VELOCIDAD_IMPOSIBLE" | "FUERA_DE_PAIS" | "SALTO_DISTANCIA" | null } {
  if (
    punto.lat < MEXICO_BOUNDS.latMin || punto.lat > MEXICO_BOUNDS.latMax ||
    punto.lng < MEXICO_BOUNDS.lngMin || punto.lng > MEXICO_BOUNDS.lngMax
  ) {
    return { esAnomalo: true, motivo: "FUERA_DE_PAIS" };
  }

  if (anterior) {
    const distanciaKm = distanciaHaversineKm(anterior.lat, anterior.lng, punto.lat, punto.lng);
    const horas = (punto.timestamp.getTime() - anterior.timestamp.getTime()) / 3_600_000;

    if (horas > 0) {
      const velocidadImplicita = distanciaKm / horas;
      if (velocidadImplicita > VELOCIDAD_MAXIMA_KMH) {
        return { esAnomalo: true, motivo: "VELOCIDAD_IMPOSIBLE" };
      }
    }

    if (distanciaKm > SALTO_DISTANCIA_KM) {
      return { esAnomalo: true, motivo: "SALTO_DISTANCIA" };
    }
  }

  return { esAnomalo: false, motivo: null };
}
