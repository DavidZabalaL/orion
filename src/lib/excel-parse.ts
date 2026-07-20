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

export async function parsearWorkbook(formData: FormData, campoArchivo = "archivo"): Promise<{ hojas: HojaParseada[] }> {
  const archivo = formData.get(campoArchivo);
  if (!(archivo instanceof File)) throw new Error("Sube un archivo .xlsx válido.");

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
