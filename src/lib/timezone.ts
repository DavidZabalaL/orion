// México eliminó el horario de verano desde 2022 — todo el país queda fijo en
// UTC-6 (America/Mexico_City) todo el año. Los servidores (Vercel) corren en
// UTC, así que cualquier cálculo de "medianoche local" hecho con Date.setHours()
// usa la hora del servidor, no la de México — este módulo centraliza el ajuste.
export const ZONA_HORARIA_MX = "America/Mexico_City";
const OFFSET_MX_HORAS = 6;
const HORA_MS = 3_600_000;

/** Medianoche de "hoy" en hora de México, expresada como el instante UTC correspondiente. */
export function inicioDeHoyMx(): Date {
  const ahoraEnMarcoMx = new Date(Date.now() - OFFSET_MX_HORAS * HORA_MS);
  ahoraEnMarcoMx.setUTCHours(0, 0, 0, 0);
  return new Date(ahoraEnMarcoMx.getTime() + OFFSET_MX_HORAS * HORA_MS);
}

/** Medianoche del día 1 del mes actual en hora de México, expresada como instante UTC. */
export function inicioDeMesMx(): Date {
  const ahoraEnMarcoMx = new Date(Date.now() - OFFSET_MX_HORAS * HORA_MS);
  ahoraEnMarcoMx.setUTCDate(1);
  ahoraEnMarcoMx.setUTCHours(0, 0, 0, 0);
  return new Date(ahoraEnMarcoMx.getTime() + OFFSET_MX_HORAS * HORA_MS);
}
