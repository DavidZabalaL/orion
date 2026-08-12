import * as XLSX from "xlsx";

export type HojaParseada = {
  nombre: string;
  headers: string[];
  filas: string[][];
};

export type ResultadoImportacion = {
  creadas: string[];
  actualizadas: string[];
  omitidas: { fila: number; motivo: string }[];
  advertencias: { fila: number; mensaje: string }[];
};

export type FilaMapeada = Record<string, string>;

function esCsv(archivo: File) {
  return /\.csv$/i.test(archivo.name) || archivo.type === "text/csv";
}

// Parser CSV minimalista: soporta comillas dobles, comas y punto y coma como
// delimitador (frecuente en exportes de bancos/proveedores en español), y
// saltos de línea CRLF/LF dentro y fuera de campos entrecomillados.
function parsearCsv(texto: string, nombre: string): HojaParseada {
  const limpio = texto.replace(/^﻿/, "");
  const delimitador = (limpio.slice(0, limpio.indexOf("\n") > -1 ? limpio.indexOf("\n") : undefined).match(/;/g)?.length ?? 0) >
    (limpio.slice(0, limpio.indexOf("\n") > -1 ? limpio.indexOf("\n") : undefined).match(/,/g)?.length ?? 0)
    ? ";"
    : ",";

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let enComillas = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { campo += '"'; i++; }
        else enComillas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === delimitador) {
      fila.push(campo.trim());
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(campo.trim());
      campo = "";
      if (fila.some((v) => v)) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }
  if (campo || fila.length) {
    fila.push(campo.trim());
    if (fila.some((v) => v)) filas.push(fila);
  }

  if (filas.length === 0) throw new Error("El archivo CSV está vacío.");
  const [headers, ...resto] = filas;
  return { nombre, headers, filas: resto.slice(0, 2000) };
}

// Se usa SheetJS (xlsx) en vez de exceljs porque exceljs solo lee el formato
// OOXML moderno (.xlsx); muchos reportes de proveedores (p.ej. Efectivale)
// vienen en el formato binario antiguo (.xls, BIFF/OLE2), que SheetJS sí soporta.
function parsearExcelConSheetJS(buffer: ArrayBuffer): HojaParseada[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const hojas: HojaParseada[] = [];

  for (const nombre of workbook.SheetNames) {
    const sheet = workbook.Sheets[nombre];
    const filasCrudas = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as unknown[][];
    const filas = filasCrudas
      .map((fila) => fila.map((v) => (v === null || v === undefined ? "" : String(v))))
      .filter((fila) => fila.some((v) => v.trim()));

    if (filas.length === 0) continue;
    const [headers, ...resto] = filas;
    hojas.push({ nombre, headers, filas: resto.slice(0, 500) });
  }

  return hojas;
}

// Server Actions ocultan el mensaje real de cualquier error que se lance (throw)
// en producción — Next.js lo reemplaza por un texto genérico por seguridad.
// Por eso este parseo NO lanza excepciones para casos esperables (archivo vacío,
// dañado, protegido, etc.): devuelve { ok:false, error } para que el mensaje
// real le llegue al usuario en el formulario.
export type ResultadoParseo = { ok: true; hojas: HojaParseada[] } | { ok: false; error: string };

export async function parsearWorkbook(formData: FormData, campoArchivo = "archivo"): Promise<ResultadoParseo> {
  const archivo = formData.get(campoArchivo);
  if (!(archivo instanceof File)) return { ok: false, error: "Sube un archivo .xlsx, .xls o .csv válido." };

  try {
    const hojas = esCsv(archivo)
      ? [parsearCsv(await archivo.text(), archivo.name.replace(/\.csv$/i, "") || "CSV")]
      : parsearExcelConSheetJS(await archivo.arrayBuffer());

    if (hojas.length === 0) return { ok: false, error: "No se encontraron hojas con datos en el archivo." };
    return { ok: true, hojas };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error && e.message ? e.message : "No se pudo leer el archivo. Verifica que sea un .xlsx, .xls o .csv válido y no esté dañado o protegido con contraseña.",
    };
  }
}
