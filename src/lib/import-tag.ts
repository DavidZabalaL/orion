export const CAMPOS_TAG = [
  { key: "fecha", label: "Fecha", requerido: true },
  { key: "hora", label: "Hora (opcional, evita falsos duplicados)", requerido: false },
  { key: "monto", label: "Monto", requerido: true },
  { key: "caseta", label: "Caseta", requerido: false },
  { key: "tarjetaIdmx", label: "Tarjeta IDMX (opcional, evita falsos duplicados)", requerido: false },
  { key: "numeroEconomico", label: "N° económico (si viene en el archivo)", requerido: false },
] as const;

export type CampoTagKey = (typeof CAMPOS_TAG)[number]["key"];

const OFFSET_MX_HORAS = 6;

const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
// Sin anclar el final ($): varios reportes (Efectivale, PASE) traen la hora
// pegada después en la misma celda ("7/4/26 9:28", "25/12/2026 14:30") — el
// \b evita que un año de más dígitos matchee de más.
const DDMMYYYY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
const DMYY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/;

/** Medianoche de esa fecha EN MÉXICO, expresada como el instante UTC correspondiente
 * (mismo criterio que parseFechaLocalMx en src/lib/timezone.ts) — nunca `new Date(anio,mes,dia)`
 * directo: usa la zona horaria del proceso (UTC en Vercel), que al mostrarse convertida a
 * hora de México cae un día antes. */
function medianocheMx(anio: number, mesIdx: number, dia: number): Date | null {
  const fecha = new Date(Date.UTC(anio, mesIdx, dia, OFFSET_MX_HORAS, 0, 0));
  return isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Fecha "flexible" — admite ISO (YYYY-MM-DD), DD/MM/YYYY y D/M/AA o M/D/AA con
 * año de 2 dígitos (formato de los reportes de PASE: "8/24/26"). Con año de 2
 * dígitos, el orden día/mes es ambiguo: si un lado no puede ser mes (>12) se
 * usa ese para desambiguar; si ambos podrían serlo, se asume M/D/AA (como
 * llegan esos reportes). Último recurso: deja que `Date` lo intente, pero sin
 * confiar en su zona horaria para no perder el día.
 */
export function parsearFechaFlexible(valor: string): Date | null {
  const limpio = valor.trim();
  if (!limpio) return null;

  let m = limpio.match(ISO);
  if (m) {
    const [, anio, mes, dia] = m;
    return medianocheMx(Number(anio), Number(mes) - 1, Number(dia));
  }

  m = limpio.match(DDMMYYYY);
  if (m) {
    const [, dia, mes, anio] = m;
    return medianocheMx(Number(anio), Number(mes) - 1, Number(dia));
  }

  m = limpio.match(DMYY);
  if (m) {
    const [, a, b, anioCorto] = m;
    const anio = 2000 + Number(anioCorto);
    const n1 = Number(a);
    const n2 = Number(b);
    let dia: number;
    let mes: number;
    if (n1 > 12) { dia = n1; mes = n2; }
    else if (n2 > 12) { mes = n1; dia = n2; }
    else { mes = n1; dia = n2; }
    return medianocheMx(anio, mes - 1, dia);
  }

  const fallback = new Date(limpio);
  if (isNaN(fallback.getTime())) return null;
  return medianocheMx(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate());
}

const HORA = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/;

/** Agrega una hora "HH:MM" o "HH:MM:SS" a una fecha ya resuelta a medianoche en
 * México (ver parsearFechaFlexible) — para distinguir cruces reales distintos
 * que coinciden en fecha/monto/caseta. Hora inválida o vacía → misma fecha sin
 * cambios (medianoche), igual que antes de que existiera este campo. */
export function agregarHora(fecha: Date, valorHora: string | null | undefined): Date {
  if (!valorHora) return fecha;
  const m = valorHora.trim().match(HORA);
  if (!m) return fecha;
  const [, hh, mm, ss] = m;
  const horas = Number(hh);
  const minutos = Number(mm);
  const segundos = ss ? Number(ss) : 0;
  if (horas > 23 || minutos > 59 || segundos > 59) return fecha;
  return new Date(fecha.getTime() + (horas * 3600 + minutos * 60 + segundos) * 1000);
}
