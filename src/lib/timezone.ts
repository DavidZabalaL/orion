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

/**
 * Convierte un valor "YYYY-MM-DD" de un `<input type="date">` (o
 * "YYYY-MM-DDTHH:mm" de `type="datetime-local"`) al instante UTC de esa
 * fecha/hora EN MÉXICO — no llamar `new Date("YYYY-MM-DD")` directo: el
 * constructor de Date interpreta ese formato como medianoche UTC, que al
 * mostrarse convertida a hora de México (fmtFecha) cae en el día anterior
 * (00:00 UTC − 6h = 18:00 del día previo). Vacío/inválido → null.
 */
export function parseFechaLocalMx(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, anio, mes, dia, hora, min] = m;
  return new Date(
    Date.UTC(Number(anio), Number(mes) - 1, Number(dia), OFFSET_MX_HORAS + Number(hora ?? 0), Number(min ?? 0))
  );
}
