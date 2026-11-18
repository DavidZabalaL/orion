// Regla del kilometraje oficial (Unidad.kmOficial), triangulada. Pura, sin
// Prisma — los datos los arma src/lib/km-oficial-datos.ts.
//
// 1. Manda el odómetro del último checklist (diario o semanal).
// 2. Se descarta si es claramente erróneo: no cuadra con NINGUNA de las otras
//    lecturas (los 2 checklists anteriores o la última carga de combustible del
//    estado de cuenta). "Cuadrar" = la diferencia de km entre ambas lecturas es
//    la que recorrió el GPS en ese lapso (±300 km ±25 %); sin GPS en alguna de
//    las dos fechas, que no retroceda más de 300 km ni avance más de 1,000 km
//    por día transcurrido. El odómetro absoluto del GPS no se usa como
//    referencia: en varias unidades está desfasado decenas de miles de km;
//    solo cuenta lo que avanza.
// 3. Si el último no cuadra, se marca discrepancia y vale el checklist anterior
//    más reciente que sí cuadre; si ninguno cuadra, no se sobrescribe.
// 4. Sin checklists: la última carga con km; sin cargas, el odómetro GPS.

export type FuenteKm = "CHECKLIST" | "CARGA" | "GPS";

/** Una lectura de odómetro y lo que marcaba el odómetro GPS en ese momento (null = sin GPS a esa hora). */
export type Lectura = { km: number; fecha: Date; gps: number | null };

export type LecturasKm = {
  /** Más reciente primero. */
  checklists: Lectura[];
  carga: Lectura | null;
  gps: Lectura | null;
};

export type ResultadoKmOficial = {
  /** Lectura elegida; null = ninguna confiable, se conserva el valor guardado. */
  oficial: (Lectura & { fuente: FuenteKm }) | null;
  /** El último checklist no cuadra con ninguna otra lectura y no se usó. */
  discrepancia: boolean;
};

export const FUENTE_KM_LABEL: Record<FuenteKm, string> = { CHECKLIST: "Checklist", CARGA: "Carga de combustible", GPS: "GPS" };

const TOLERANCIA_KM = 300;
const MARGEN_GPS = 0.25;
const KM_POR_DIA_MAX = 1000;

/** ¿Es creíble pasar de la lectura `a` a la `b` (en cualquier orden de fechas)? */
export function cuadran(a: Lectura, b: Lectura): boolean {
  const diferencia = b.km - a.km;
  if (a.gps != null && b.gps != null) {
    const recorridoGps = b.gps - a.gps;
    return Math.abs(diferencia - recorridoGps) <= TOLERANCIA_KM + MARGEN_GPS * Math.abs(recorridoGps);
  }
  const maximo = ((b.fecha.getTime() - a.fecha.getTime()) / 86_400_000) * KM_POR_DIA_MAX;
  return diferencia >= Math.min(0, maximo) - TOLERANCIA_KM && diferencia <= Math.max(0, maximo) + TOLERANCIA_KM;
}

export function resolverKmOficial({ checklists, carga, gps }: LecturasKm): ResultadoKmOficial {
  for (let i = 0; i < checklists.length; i++) {
    const referencias = [checklists[i + 1], checklists[i + 2], carga].filter((r): r is Lectura => r != null);
    if (referencias.length === 0 || referencias.some((r) => cuadran(r, checklists[i]))) {
      return { oficial: { ...checklists[i], fuente: "CHECKLIST" }, discrepancia: i > 0 };
    }
  }
  if (checklists.length > 0) return { oficial: null, discrepancia: true };
  if (carga) return { oficial: { ...carga, fuente: "CARGA" }, discrepancia: false };
  if (gps) return { oficial: { ...gps, fuente: "GPS" }, discrepancia: false };
  return { oficial: null, discrepancia: false };
}

/**
 * Base del km del año: la primera lectura (por fecha) que cuadra con alguna de
 * las 2 siguientes, para no arrancar el año con un dedazo. Si es la única, vale.
 */
export function primeraLecturaConfiable(lecturas: Lectura[]): Lectura | null {
  const orden = [...lecturas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return (
    orden.find((l, i) => {
      const siguientes = orden.slice(i + 1, i + 3);
      return siguientes.length === 0 || siguientes.some((s) => cuadran(l, s));
    }) ?? null
  );
}

export type ComparacionKm = { fuente: FuenteKm; lectura: Lectura; cuadra: boolean | null };

/** Lo que dice cada fuente (último checklist, última carga, GPS) frente al km oficial, para la ficha. */
export function compararConOficial(l: LecturasKm, r: ResultadoKmOficial): ComparacionKm[] {
  const filas: ComparacionKm[] = [];
  const contra = (lectura: Lectura) => (r.oficial ? cuadran(r.oficial, lectura) : null);
  if (l.checklists[0]) filas.push({ fuente: "CHECKLIST", lectura: l.checklists[0], cuadra: !r.discrepancia });
  if (l.carga) filas.push({ fuente: "CARGA", lectura: l.carga, cuadra: contra(l.carga) });
  if (l.gps) filas.push({ fuente: "GPS", lectura: l.gps, cuadra: contra(l.gps) });
  return filas;
}
