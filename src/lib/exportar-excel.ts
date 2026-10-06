// Exportación genérica a Excel (cliente), multi-hoja — complementa
// exportar-csv.ts para los casos donde se necesitan varias hojas (ej. un
// tipo de checklist por hoja) o columnas que no caben cómodas en CSV.
import * as XLSX from "xlsx";

export type HojaExcel = {
  nombre: string;
  headers: string[];
  filas: (string | number)[][];
};

export function exportarExcel(nombreArchivo: string, hojas: HojaExcel[]) {
  const libro = XLSX.utils.book_new();
  for (const hoja of hojas) {
    const datos = [hoja.headers, ...hoja.filas];
    const ws = XLSX.utils.aoa_to_sheet(datos);
    XLSX.utils.book_append_sheet(libro, ws, (hoja.nombre || "Hoja").slice(0, 31));
  }
  XLSX.writeFile(libro, `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
