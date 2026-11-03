// Cliente de la Intellihub API (GPS/telemetría, Forward Thinking Systems) —
// módulo G. Requiere INTELLIHUB_API_USER / INTELLIHUB_API_PASSWORD (ver
// .env.example). El token dura 3600s; se cachea en memoria del proceso y se
// renueva automáticamente cuando falta poco para expirar. En un entorno
// serverless esto solo ahorra llamadas dentro de una misma invocación tibia
// ("warm"), no entre invocaciones — es una optimización, no un requisito.
const BASE_URL = "https://rest.ftsgps.com/intellihubapi/v1";
const MILLAS_A_KM = 1.60934;

let tokenCacheado: { valor: string; expiraEn: number } | null = null;

async function obtenerToken(): Promise<string> {
  if (tokenCacheado && tokenCacheado.expiraEn > Date.now() + 30_000) {
    return tokenCacheado.valor;
  }

  const userName = process.env.INTELLIHUB_API_USER;
  const password = process.env.INTELLIHUB_API_PASSWORD;
  if (!userName || !password) {
    throw new Error("Faltan las variables de entorno INTELLIHUB_API_USER / INTELLIHUB_API_PASSWORD.");
  }

  const respuesta = await fetch(`${BASE_URL}/authentication/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, password }),
  });

  if (!respuesta.ok) {
    throw new Error(`No se pudo autenticar contra la Intellihub API (HTTP ${respuesta.status}).`);
  }

  const datos = (await respuesta.json()) as { accessToken: string; expiresInSeconds: number };
  tokenCacheado = { valor: datos.accessToken, expiraEn: Date.now() + datos.expiresInSeconds * 1000 };
  return tokenCacheado.valor;
}

export type EstatusVehiculoIntellihub = {
  vehicleId: number;
  vehicleName: string;
  lat: number | null;
  lon: number | null;
  /** Velocidad en mph tal como la entrega la API — usar mphAKmh() antes de guardarla. */
  velocity: number | null;
  /** Odómetro en millas tal como lo entrega la API — usar millasAKm() antes de guardarla. */
  odometer: number | null;
  lastupdate: string | null;
};

/** Trae el estatus (posición, velocidad, odómetro) de todos los vehículos de la cuenta, paginando por vehicleId. */
export async function obtenerEstatusVehiculos(): Promise<EstatusVehiculoIntellihub[]> {
  const token = await obtenerToken();
  const resultados: EstatusVehiculoIntellihub[] = [];
  let previousId = 0;

  for (;;) {
    const respuesta = await fetch(`${BASE_URL}/vehicles/status?pageSize=500&previousId=${previousId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ allVehicles: 1 }),
    });

    if (!respuesta.ok) {
      throw new Error(`Error al consultar /vehicles/status en Intellihub API (HTTP ${respuesta.status}).`);
    }

    const datos = (await respuesta.json()) as {
      hasMoreData: boolean;
      statuses: EstatusVehiculoIntellihub[];
    };

    resultados.push(...datos.statuses);
    if (!datos.hasMoreData || datos.statuses.length === 0) break;
    previousId = datos.statuses[datos.statuses.length - 1].vehicleId;
  }

  return resultados;
}

/**
 * Bitácora de posiciones de un vehículo (cada pocos segundos, a diferencia del
 * cron que solo guarda una foto cada 10 min). Se consulta en vivo para dibujar
 * el historial; no se persiste. Devuelve los puntos en orden cronológico.
 */
export async function obtenerLogVehiculo(
  vehicleId: number,
  desde: Date,
  hasta: Date
): Promise<{ lat: number; lng: number; timestamp: string }[]> {
  const token = await obtenerToken();
  const params = `startDate=${desde.toISOString().slice(0, 19)}Z&endDate=${hasta.toISOString().slice(0, 19)}Z&pageSize=500`;

  async function pagina(n: number) {
    const respuesta = await fetch(`${BASE_URL}/vehicles/log/${vehicleId}?${params}&pageNumber=${n}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!respuesta.ok) {
      throw new Error(`Error al consultar /vehicles/log en Intellihub API (HTTP ${respuesta.status}).`);
    }
    return (await respuesta.json()) as {
      totalPages: number;
      vehicleLogs: { lat: number | null; lon: number | null; logDateUTC: string }[] | null;
    };
  }

  // La primera página dice cuántas hay; el resto se pide en paralelo (7 días ≈ 10 páginas).
  const primera = await pagina(1);
  // shortcut: tope de 60 páginas (~30k puntos, semanas de recorrido); rangos más largos se truncan.
  const total = Math.min(primera.totalPages ?? 1, 60);
  const resto = await Promise.all(Array.from({ length: total - 1 }, (_, i) => pagina(i + 2)));

  const puntos = [primera, ...resto]
    .flatMap((p) => p.vehicleLogs ?? [])
    .filter((l) => l.lat != null && l.lon != null && l.logDateUTC)
    .map((l) => ({ lat: l.lat as number, lng: l.lon as number, timestamp: l.logDateUTC }));

  return puntos.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function mphAKmh(mph: number): number {
  return mph * MILLAS_A_KM;
}

export function millasAKm(millas: number): number {
  return millas * MILLAS_A_KM;
}
