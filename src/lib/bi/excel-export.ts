// Primera ruta de EXPORTACIÓN con xlsx en el proyecto — hasta ahora solo se
// usaba para IMPORTAR (src/lib/excel-parse.ts, src/lib/import-presupuesto.ts).
import * as XLSX from "xlsx";
import type { FilaReporte } from "@/lib/bi/ejecutar-reporte";

export function generarExcelReporte(nombreHoja: string, columnas: { key: string; label: string }[], filas: FilaReporte[]): Buffer {
  const datos = filas.map((fila) => Object.fromEntries(columnas.map((c) => [c.label, fila[c.key] ?? ""])));
  const hoja = XLSX.utils.json_to_sheet(datos, { header: columnas.map((c) => c.label) });
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, (nombreHoja || "Reporte").slice(0, 31));
  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
