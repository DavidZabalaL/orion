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
    // Excel prohíbe \ / ? * [ ] : en el nombre de hoja y lo limita a 31
    // caracteres — un nombre inválido hace que todo el libro falle al abrir.
    const nombreHoja = (hoja.nombre || "Hoja").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Hoja";
    XLSX.utils.book_append_sheet(libro, ws, nombreHoja);
  }
  // XLSX.writeFile depende de que la librería detecte el entorno de navegador
  // y dispare la descarga por su cuenta — con el build que se usa aquí (xlsx
  // 0.20.3 vía CDN) eso no ocurre de forma confiable. Se arma el Blob a mano,
  // igual que ya hace exportar-csv.ts, que sí funciona.
  const buffer = XLSX.write(libro, { type: "array", bookType: "xlsx" });
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
