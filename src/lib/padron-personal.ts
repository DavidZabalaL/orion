import type { HojaParseada } from "@/lib/excel-parse";

// Solo las columnas que guarda el padrón; el archivo de RH trae más (PUESTO,
// TIPO DE SANGRE) que no se leen a propósito.
const COLUMNAS = {
  nombreCompleto: ["NOMBRE COMPLETO"],
  empresa: ["EMPRESA"],
  lugarDeTrabajo: ["LUGAR DE TRABAJO"],
  curp: ["CURP"],
  rfc: ["RFC"],
  nss: ["NSS"],
  telefono: ["TELEFONO", "TELÉFONO"],
} as const;

const CURP_VALIDO = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

// Letras cirílicas idénticas a la vista a las latinas — aparecen en CURPs
// copiados de otros sistemas y hacen que el CURP "se vea bien" pero no coincida.
const HOMOGLIFOS: Record<string, string> = { А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y" };

export function normalizarCurp(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[АВЕКМНОРСТХУ]/g, (c) => HOMOGLIFOS[c] ?? c);
}

/** Para comparar nombres entre el archivo y Orión: sin acentos, mayúsculas y espacios simples. */
export function normalizarNombre(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type RegistroPadron = {
  nombreCompleto: string;
  empresa: string;
  lugarDeTrabajo: string;
  curp: string;
  rfc: string | null;
  nss: string | null;
  telefono: string | null;
};

export type FilaInvalidaPadron = { fila: number; nombre: string; curp: string; motivo: string };

export type ExtraccionPadron =
  | { ok: false; error: string }
  | { ok: true; filas: number; registros: RegistroPadron[]; invalidas: FilaInvalidaPadron[]; nombres: Set<string> };

function indiceDe(headers: string[], nombres: readonly string[]): number {
  const limpios = headers.map((h) => h.trim().toUpperCase());
  for (const nombre of nombres) {
    const idx = limpios.indexOf(nombre);
    if (idx >= 0) return idx;
  }
  return -1;
}

/** Hoja "Activos" si existe; si no, la primera con datos. */
export function elegirHojaPadron(hojas: HojaParseada[]): HojaParseada | undefined {
  return hojas.find((h) => h.nombre.trim().toUpperCase() === "ACTIVOS") ?? hojas[0];
}

export function extraerRegistrosPadron(hoja: HojaParseada): ExtraccionPadron {
  const idx = Object.fromEntries(Object.entries(COLUMNAS).map(([campo, nombres]) => [campo, indiceDe(hoja.headers, nombres)])) as Record<keyof typeof COLUMNAS, number>;
  if (idx.nombreCompleto < 0 || idx.curp < 0) {
    return { ok: false, error: `El archivo debe traer las columnas "NOMBRE COMPLETO" y "CURP". Columnas encontradas: ${hoja.headers.join(", ")}.` };
  }

  const texto = (fila: string[], i: number) => (i >= 0 ? (fila[i] ?? "").trim() : "");
  const registros: RegistroPadron[] = [];
  const invalidas: FilaInvalidaPadron[] = [];
  const nombres = new Set<string>();
  const curpsVistos = new Set<string>();

  hoja.filas.forEach((fila, i) => {
    const numFila = i + 2;
    const nombreCompleto = texto(fila, idx.nombreCompleto).toUpperCase().replace(/\s+/g, " ");
    const curpCrudo = texto(fila, idx.curp);
    const curp = normalizarCurp(curpCrudo);
    if (nombreCompleto && !nombreCompleto.startsWith("#")) nombres.add(normalizarNombre(nombreCompleto));

    let motivo: string | null = null;
    if (!nombreCompleto || nombreCompleto.startsWith("#")) motivo = "Sin nombre o con error de fórmula";
    else if (!curp) motivo = "Sin CURP";
    else if (!CURP_VALIDO.test(curp)) motivo = "CURP con formato inválido";
    else if (curpsVistos.has(curp)) motivo = "CURP repetido";
    if (motivo) {
      if (nombreCompleto || curpCrudo) invalidas.push({ fila: numFila, nombre: nombreCompleto, curp: curpCrudo, motivo });
      return;
    }

    curpsVistos.add(curp);
    registros.push({
      nombreCompleto,
      empresa: texto(fila, idx.empresa),
      lugarDeTrabajo: texto(fila, idx.lugarDeTrabajo),
      curp,
      rfc: texto(fila, idx.rfc).toUpperCase() || null,
      nss: texto(fila, idx.nss) || null,
      telefono: texto(fila, idx.telefono) || null,
    });
  });

  return { ok: true, filas: hoja.filas.length, registros, invalidas, nombres };
}
