import * as XLSX from "xlsx";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";

export type FilaPresupuestoExcel = {
  proyectoExcel: string;
  partidaExcel: string;
  anio: number;
  mes: number;
  monto: number;
};

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

// Catálogo fijo de partidas ("No.") de la plantilla real de Grupo Kabat — la misma
// hoja/proyecto siempre trae estos códigos en la columna B, independientemente del
// texto exacto del concepto en la columna C.
const CODIGOS_PARTIDA = new Set(["501", "502", "503", "504", "505", "505-B", "506", "507", "508", "509", "510"]);

// Sufijo que Grupo Kabat agrega al nombre de cada hoja del Excel real (ej. "TAMPS PPO").
const SUFIJO_HOJA_PPO = /\s*PPO\s*$/i;

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function aliasDesdeNombreHoja(nombreHoja: string): string {
  return nombreHoja.replace(SUFIJO_HOJA_PPO, "").trim() || nombreHoja.trim();
}

// La hoja de cada proyecto no tiene una sola fila de encabezado: tiene 2 (fila de
// nombre de mes en celdas combinadas, fila de No./PTTO/REAL/DIFERENCIA por bloque
// de mes) y 12 bloques repetidos de 4 columnas. Solo se extrae PTTO.
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
 * Cada hoja de la plantilla real ("CHIAP PPO", "CDMX PPO", "Direccion PPO", ...)
 * corresponde a un solo proyecto y trae el mismo catálogo fijo de 11 partidas
 * (columna "No.": 501-510, 505-B). Devuelve [] si la hoja no trae ese formato
 * (por ejemplo si alguien agrega una hoja de notas) para que se ignore en
 * silencio en vez de romper la carga completa.
 */
function parsearHojaProyecto(filas: unknown[][], anio: number): Omit<FilaPresupuestoExcel, "proyectoExcel">[] {
  const indiceSubencabezado = filas.findIndex((fila) => fila.some((v) => normalizar(String(v ?? "")) === "CONCEPTO"));
  if (indiceSubencabezado < 1) return [];

  const filaMeses = filas[indiceSubencabezado - 1].map((v) => String(v ?? ""));
  const filaSubencabezados = filas[indiceSubencabezado].map((v) => String(v ?? ""));
  const bloques = detectarBloquesMensuales(filaMeses, filaSubencabezados);
  if (bloques.length === 0) return [];

  const resultado: Omit<FilaPresupuestoExcel, "proyectoExcel">[] = [];

  for (let fila = indiceSubencabezado + 1; fila < filas.length; fila++) {
    const codigo = String(filas[fila][1] ?? "").trim().toUpperCase();
    if (!CODIGOS_PARTIDA.has(codigo)) continue;

    const partidaExcel = String(filas[fila][2] ?? "").trim();
    if (!partidaExcel) continue;

    for (const bloque of bloques) {
      const monto = filas[fila][bloque.colPtto];
      const montoNum = typeof monto === "number" ? monto : parseFloat(String(monto ?? "").replace(/[^0-9.-]/g, ""));
      if (!montoNum || Number.isNaN(montoNum)) continue;

      resultado.push({ partidaExcel, anio, mes: bloque.mes, monto: montoNum });
    }
  }

  return resultado;
}

export async function parsearExcelPresupuesto(formData: FormData): Promise<FilaPresupuestoExcel[]> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File)) throw new Error("Sube un archivo .xlsx o .xls válido.");

  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  if (!anio || anio < 2000) throw new Error("Indica el año del presupuesto que estás cargando.");

  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

  const resultado: FilaPresupuestoExcel[] = [];

  for (const nombreHoja of workbook.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja], { header: 1, raw: true, defval: "" }) as unknown[][];
    const filasHoja = parsearHojaProyecto(filas, anio);
    if (filasHoja.length === 0) continue;

    const proyectoExcel = aliasDesdeNombreHoja(nombreHoja);
    for (const fila of filasHoja) resultado.push({ ...fila, proyectoExcel });
  }

  if (resultado.length === 0) {
    throw new Error('No se detectó ninguna hoja con el formato de presupuesto esperado (catálogo de partidas "No." 501-510).');
  }

  return resultado;
}

const MAPA_CATEGORIA: Record<string, keyof typeof CATEGORIA_GASTO_LABEL> = {
  "MANTENIMIENTO PREVENTIVO": "MANTENIMIENTO_PREVENTIVO",
  "MANTENIMIENTO VEHICULOS PREVENTIVO": "MANTENIMIENTO_PREVENTIVO",
  "MANTENIMIENTO CORRECTIVO": "MANTENIMIENTO_CORRECTIVO",
  "MANTENIMIENTO VEHICULOS CORRECTIVO": "MANTENIMIENTO_CORRECTIVO",
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
 * proyecto del Excel (nombre de hoja, sin el sufijo "PPO") contra el catálogo real
 * de Proyecto. No usa heurísticas complejas de alias a propósito: cualquier hoja
 * que no case aquí se deja sin resolver (proyectoId null) para que el usuario la
 * case manualmente en la pantalla de importación — el catálogo de proyectos lo
 * mantiene Grupo Kabat directamente y prefieren resolver ambigüedades a mano.
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
