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

export function mphAKmh(mph: number): number {
  return mph * MILLAS_A_KM;
}

export function millasAKm(millas: number): number {
  return millas * MILLAS_A_KM;
}
