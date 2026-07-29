import ExcelJS from "exceljs";

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

export async function parsearWorkbook(formData: FormData, campoArchivo = "archivo"): Promise<{ hojas: HojaParseada[] }> {
  const archivo = formData.get(campoArchivo);
  if (!(archivo instanceof File)) throw new Error("Sube un archivo .xlsx, .xls o .csv válido.");

  if (esCsv(archivo)) {
    const texto = await archivo.text();
    return { hojas: [parsearCsv(texto, archivo.name.replace(/\.csv$/i, "") || "CSV")] };
  }

  const buffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);

  const hojas: HojaParseada[] = [];

  workbook.eachSheet((sheet) => {
    const filas: string[][] = [];
    sheet.eachRow((row) => {
      const valores: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const v = cell.value;
        valores.push(v === null || v === undefined ? "" : String(typeof v === "object" && "text" in (v as object) ? (v as { text: string }).text : v));
      });
      filas.push(valores);
    });

    if (filas.length === 0) return;
    const [headers, ...resto] = filas;
    hojas.push({ nombre: sheet.name, headers, filas: resto.slice(0, 500) });
  });

  if (hojas.length === 0) throw new Error("No se encontraron hojas con datos en el archivo.");

  return { hojas };
}
