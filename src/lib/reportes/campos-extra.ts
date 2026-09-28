// Cálculo real de los "campos extra" elegidos para el reporte de Estatus de
// flota — reutiliza el mismo motor de consultas BI que ya usa el Explorador
// (src/lib/bi/motor-consultas.ts) para no duplicar la lógica de whitelist de
// columnas/agregaciones. Ver campos-extra-tipos.ts para la heurística de
// "cómo mostrarlo" y el porqué no se acota al periodo del reporte.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerDataset, obtenerCampo } from "@/lib/bi/metadata";
import { ejecutarSimple } from "@/lib/bi/motor-consultas";
import {
  VISUALIZACION_SUGERIDA,
  type AgrupacionTemporal,
  type CampoExtraSeleccionado,
  type CampoExtraResultado,
} from "@/lib/reportes/campos-extra-tipos";

const MAX_FILAS_BARRAS = 12;

// Expresión SQL del "bucket" de cada agrupación temporal, a partir de la
// expresión de fecha del dataset (ej. `g."fecha"`) — siempre sobre un string
// interno de metadata.ts, nunca sobre input del cliente.
const BUCKET_SQL: Record<AgrupacionTemporal, (fechaExpr: string) => string> = {
  mes: (f) => `TO_CHAR(${f}, 'YYYY-MM')`,
  trimestre: (f) => `TO_CHAR(${f}, 'YYYY') || '-T' || EXTRACT(QUARTER FROM ${f})::text`,
  semestre: (f) => `TO_CHAR(${f}, 'YYYY') || '-S' || (CASE WHEN EXTRACT(MONTH FROM ${f}) <= 6 THEN '1' ELSE '2' END)`,
  anio: (f) => `TO_CHAR(${f}, 'YYYY')`,
};

/** "2026-03" → "mar 2026", "2026-T1" → "T1 2026", "2026-S1" → "Sem. 1 2026", "2026" → "2026". */
function formatearBucket(bucket: string, agrupacion: AgrupacionTemporal): string {
  if (agrupacion === "mes") {
    const [anio, mes] = bucket.split("-");
    return new Date(Number(anio), Number(mes) - 1, 1).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
  }
  if (agrupacion === "trimestre") {
    const [anio, t] = bucket.split("-T");
    return `T${t} ${anio}`;
  }
  if (agrupacion === "semestre") {
    const [anio, s] = bucket.split("-S");
    return `Sem. ${s} ${anio}`;
  }
  return bucket;
}

function condicionAlcance(proyectoScopeExpr: string, proyectoIds: string[] | null): { condicion: Prisma.Sql; llave: string } {
  if (proyectoIds === null) return { condicion: Prisma.empty, llave: "ALL" };
  if (proyectoIds.length === 0) return { condicion: Prisma.sql`FALSE`, llave: "NONE" };
  return { condicion: Prisma.sql`${Prisma.raw(proyectoScopeExpr)} IN (${Prisma.join(proyectoIds)})`, llave: [...proyectoIds].sort().join(",") };
}

/**
 * Calcula los campos extra elegidos para un alcance de proyectos — usado por
 * cada bloque (general/selección/por proyecto) del reporte de Estatus de
 * flota. Selecciones inválidas (dataset/campo ya no existe) se ignoran en
 * silencio en vez de romper el reporte completo.
 *
 * Si el dataset tiene `fechaActividadExpr` (una bitácora de eventos: gastos,
 * combustible, checklists, etc.), el resultado se acota a [desde, hasta] —
 * el mismo periodo que el resto del reporte — en vez de sumar/agrupar todo
 * el histórico. Los datasets de estado/snapshot (unidades, seguros, etc.,
 * sin `fechaActividadExpr`) siguen siendo históricos: acotarlos por fecha no
 * tendría el mismo significado (ej. "km oficial" no es un evento fechado).
 */
export async function calcularCamposExtra(
  seleccionados: CampoExtraSeleccionado[],
  proyectoIds: string[] | null,
  desde: Date,
  hasta: Date
): Promise<CampoExtraResultado[]> {
  const resultados: CampoExtraResultado[] = [];

  for (const sel of seleccionados) {
    const dataset = obtenerDataset(sel.datasetId);
    if (!dataset) continue;
    const campo = obtenerCampo(dataset, sel.campoId);
    if (!campo) continue;

    const { condicion: condicionProyecto, llave: llaveProyecto } = condicionAlcance(dataset.proyectoScopeExpr, proyectoIds);
    const periodoAcotado = dataset.fechaActividadExpr !== undefined;
    const condicionFecha = periodoAcotado
      ? Prisma.sql`${Prisma.raw(dataset.fechaActividadExpr!)} BETWEEN ${desde} AND ${hasta}`
      : Prisma.empty;
    const condicionesCombinadas = [condicionProyecto, condicionFecha].filter((c) => c !== Prisma.empty);
    const condicion = condicionesCombinadas.length > 0 ? Prisma.join(condicionesCombinadas, " AND ") : Prisma.empty;
    // El rango de fechas debe formar parte de la llave de caché de
    // `ejecutarSimple` (ver cachearConsultaBI) — si no, dos periodos
    // distintos sobre el mismo dataset/proyecto colisionarían en caché.
    const llave = periodoAcotado ? `${llaveProyecto}|${desde.toISOString().slice(0, 10)}..${hasta.toISOString().slice(0, 10)}` : llaveProyecto;
    const tipoVisualizacion = VISUALIZACION_SUGERIDA[campo.tipo];

    // Campo numérico con agrupación temporal pedida: en vez de un solo total
    // del periodo, una barra por mes/trimestre/semestre/año — solo tiene
    // sentido si el dataset tiene una fecha de evento propia (periodoAcotado).
    if (tipoVisualizacion === "kpi" && sel.agrupacionTemporal && periodoAcotado) {
      const bucketExpr = BUCKET_SQL[sel.agrupacionTemporal](dataset.fechaActividadExpr!);
      const where = condicion === Prisma.empty ? Prisma.empty : Prisma.sql`WHERE ${condicion}`;
      const query = Prisma.sql`SELECT ${Prisma.raw(bucketExpr)} AS bucket, SUM(${Prisma.raw(campo.expr)}) AS v FROM ${Prisma.raw(dataset.from)} ${where} GROUP BY 1 ORDER BY 1`;
      const filasRaw = await prisma.$queryRaw<{ bucket: string; v: number | string | null }[]>(query);
      resultados.push({
        datasetId: dataset.id,
        campoId: campo.id,
        datasetLabel: dataset.label,
        campoLabel: campo.label,
        tipoVisualizacion: "barras",
        periodoAcotado,
        agrupacionTemporal: sel.agrupacionTemporal,
        filas: filasRaw.slice(0, MAX_FILAS_BARRAS).map((f) => ({ label: formatearBucket(f.bucket, sel.agrupacionTemporal!), valor: Number(f.v ?? 0) })),
      });
      continue;
    }

    if (tipoVisualizacion === "kpi") {
      const where = condicion === Prisma.empty ? Prisma.empty : Prisma.sql`WHERE ${condicion}`;
      const query = Prisma.sql`SELECT SUM(${Prisma.raw(campo.expr)}) AS v FROM ${Prisma.raw(dataset.from)} ${where}`;
      const filas = await prisma.$queryRaw<{ v: number | string | null }[]>(query);
      resultados.push({
        datasetId: dataset.id,
        campoId: campo.id,
        datasetLabel: dataset.label,
        campoLabel: campo.label,
        tipoVisualizacion,
        periodoAcotado,
        valorKpi: Number(filas[0]?.v ?? 0),
      });
      continue;
    }

    const rellenarHuecos = campo.tipo === "fecha_mes" || campo.tipo === "fecha_dia";
    const orden = rellenarHuecos ? "dimension" : "valor_desc";
    const simple = await ejecutarSimple(dataset, campo, campo, "conteo", orden, undefined, condicion, llave, "", rellenarHuecos);
    // Si el campo define `opciones` (ej. categorías de gasto, estatus), se
    // muestra la etiqueta legible en vez del valor crudo de la columna.
    const labelPorValor = new Map((campo.opciones ?? []).map((o) => [o.valor, o.label]));
    resultados.push({
      datasetId: dataset.id,
      campoId: campo.id,
      datasetLabel: dataset.label,
      campoLabel: campo.label,
      tipoVisualizacion,
      periodoAcotado,
      filas: simple.datos.slice(0, MAX_FILAS_BARRAS).map((d) => ({ label: labelPorValor.get(d.dimension) ?? d.dimension, valor: d.valor })),
    });
  }

  return resultados;
}
