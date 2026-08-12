import * as XLSX from "xlsx";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

export type FilaPresupuestoExcel = {
  proyectoExcel: string;
  partidaExcel: string;
  anio: number;
  mes: number;
  monto: number;
};

const NOMBRE_HOJA = "PP y Gastos";
const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function esFilaTotal(valor: string): boolean {
  return normalizar(valor).includes("TOTAL GASTO VEHICULAR");
}

// La hoja "PP y Gastos" no tiene una sola fila de encabezado: tiene 2 (fila 1 =
// nombre de mes en celdas combinadas, fila 2 = No./PTTO/REAL/Control Vehicular/DIFERENCIA
// por bloque de mes) y 12 bloques repetidos de 3 a 5 columnas. Solo se extrae PTTO.
function detectarBloquesMensuales(filaMeses: string[], filaSubencabezados: string[]) {
  const bloques: { mes: number; colPtto: number }[] = [];
  let mesActual: string | null = null;

  for (let col = 0; col < filaMeses.length; col++) {
    const celdaMes = normalizar(String(filaMeses[col] ?? ""));
    const mesEncontrado = MESES.find((m) => celdaMes.includes(m));
    if (mesEncontrado) mesActual = mesEncontrado;
    if (!mesActual) continue;

    const sub = normalizar(String(filaSubencabezados[col] ?? ""));
    if (sub === "PTTO" || sub === "PPTO") {
      bloques.push({ mes: MESES.indexOf(mesActual) + 1, colPtto: col });
    }
  }

  return bloques;
}

/**
 * Parsea la hoja "PP y Gastos" con su estructura fija de dos filas de encabezado
 * y bloques mensuales repetidos. Solo extrae la columna PTTO de cada bloque —
 * REAL, Control Vehicular y DIFERENCIA de la hoja de origen se ignoran (se
 * recalculan en Orión a partir de los gastos ya capturados).
 */
export async function parsearExcelPresupuesto(formData: FormData): Promise<FilaPresupuestoExcel[]> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) throw new Error("Sube un archivo .xlsx o .xls válido.");

  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  if (!anio || anio < 2000) throw new Error("Indica el año del presupuesto que estás cargando.");

  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

  const nombreHoja = workbook.SheetNames.find((n) => normalizar(n).includes(normalizar(NOMBRE_HOJA))) ?? workbook.SheetNames[0];
  if (!nombreHoja) throw new Error(`No se encontró la hoja "${NOMBRE_HOJA}" en el archivo.`);

  const filas = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja], { header: 1, raw: true, defval: "" }) as unknown[][];
  if (filas.length < 3) throw new Error(`La hoja "${nombreHoja}" no tiene suficientes filas para contener el formato esperado.`);

  const filaMeses = filas[0].map((v) => String(v ?? ""));
  const filaSubencabezados = filas[1].map((v) => String(v ?? ""));
  const bloques = detectarBloquesMensuales(filaMeses, filaSubencabezados);
  if (bloques.length === 0) throw new Error(`No se detectaron bloques mensuales (PTTO) en la hoja "${nombreHoja}". Verifica el formato del archivo.`);

  const resultado: FilaPresupuestoExcel[] = [];
  let proyectoActual: string | null = null;

  for (let fila = 2; fila < filas.length; fila++) {
    const columnaA = String(filas[fila][0] ?? "").trim();
    const columnaB = String(filas[fila][1] ?? "").trim();

    if (!columnaA && !columnaB) continue;
    if (esFilaTotal(columnaA) || esFilaTotal(columnaB)) {
      proyectoActual = null;
      continue;
    }

    // Fila de encabezado de bloque de proyecto: columna A trae el alias corto
    // (ej. "TAMPS") y columna B el nombre completo (ej. "GASTO VEHICULAR TAMAULIPAS").
    if (columnaA && normalizar(columnaB).startsWith("GASTO VEHICULAR")) {
      proyectoActual = columnaA;
      continue;
    }

    // Fila de partida dentro del bloque de proyecto actual.
    if (proyectoActual && columnaB) {
      for (const bloque of bloques) {
        const monto = filas[fila][bloque.colPtto];
        const montoNum = typeof monto === "number" ? monto : parseFloat(String(monto ?? "").replace(/[^0-9.-]/g, ""));
        if (!montoNum || Number.isNaN(montoNum)) continue;

        resultado.push({
          proyectoExcel: proyectoActual,
          partidaExcel: columnaB,
          anio,
          mes: bloque.mes,
          monto: montoNum,
        });
      }
    }
  }

  return resultado;
}

const MAPA_CATEGORIA: Record<string, keyof typeof CATEGORIA_GASTO_LABEL> = {
  "MANTENIMIENTO PREVENTIVO": "MANTENIMIENTO_PREVENTIVO",
  "MANTENIMIENTO CORRECTIVO": "MANTENIMIENTO_CORRECTIVO",
  LLANTAS: "LLANTAS",
  REFACCIONES: "REFACCIONES",
  CONSUMIBLES: "CONSUMIBLES",
  TENENCIA: "TENENCIA",
  VERIFICACION: "VERIFICACION",
  EMPLACAMIENTO: "EMPLACAMIENTO",
  ESTACIONAMIENTO: "ESTACIONAMIENTO",
  "MULTAS E INFRACCIONES": "MULTAS",
  MULTAS: "MULTAS",
  "RENTA DE AUTOS": "RENTA_VEHICULOS",
  "RENTA DE VEHICULOS": "RENTA_VEHICULOS",
  CASETAS: "CASETAS",
  GASOLINA: "GASOLINA",
  COMBUSTIBLE: "GASOLINA",
  "VIATICOS OPERACION": "VIATICOS_OPERACION",
  "VIATICOS DE OPERACION": "VIATICOS_OPERACION",
};

/** Mapea el nombre de partida tal como aparece en el Excel a la llave del enum CategoriaGasto. */
export function resolverCategoria(partidaExcel: string): keyof typeof CATEGORIA_GASTO_LABEL | null {
  return MAPA_CATEGORIA[normalizar(partidaExcel)] ?? null;
}

type ProyectoResoluble = { id: string; nombre: string; estadoRepublica: string };

/**
 * Intento de resolución simple (exacta o por substring normalizado) del alias de
 * proyecto del Excel contra el catálogo real de Proyecto. No usa heurísticas
 * complejas de alias a propósito: cualquier fila que no case aquí se deja sin
 * resolver (proyectoId null) para que el usuario la case manualmente en la
 * pantalla de importación — el catálogo de proyectos lo mantiene Grupo Kabat
 * directamente y prefieren resolver ambigüedades a mano.
 */
export function resolverProyecto(nombreExcel: string, proyectos: ProyectoResoluble[]): string | null {
  const buscado = normalizar(nombreExcel);

  const porNombreExacto = proyectos.find((p) => normalizar(p.nombre) === buscado);
  if (porNombreExacto) return porNombreExacto.id;

  const porEstado = proyectos.find((p) => normalizar(p.estadoRepublica) === buscado || normalizar(p.estadoRepublica).includes(buscado));
  if (porEstado) return porEstado.id;

  const porSubstring = proyectos.find((p) => normalizar(p.nombre).includes(buscado) || buscado.includes(normalizar(p.nombre)));
  if (porSubstring) return porSubstring.id;

  return null;
}
