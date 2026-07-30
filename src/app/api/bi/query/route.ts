import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import {
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  campoValidoParaEje,
  REQUISITOS_TIPO_GRAFICA,
  AGREGACION_LABEL,
  type TipoAgregacion,
  type TipoGrafica,
  type TipoOrden,
  type CampoMeta,
  type DatasetMeta,
} from "@/lib/bi/metadata";

type Filtro = { campoId: string; valor: string };

type BiQueryBody = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
  filtros?: Filtro[];
};

const LIMITE_DISPERSION = 500;
const BINS_HISTOGRAMA = 8;

function campoExpr(campo: CampoMeta): Prisma.Sql {
  if (campo.tipo === "fecha_mes") return Prisma.sql`TO_CHAR(${Prisma.raw(campo.expr)}, 'YYYY-MM')`;
  if (campo.tipo === "fecha_dia") return Prisma.sql`TO_CHAR(${Prisma.raw(campo.expr)}, 'YYYY-MM-DD')`;
  return Prisma.sql`${Prisma.raw(campo.expr)}`;
}

function metricaExpr(agregacion: TipoAgregacion, campoY: CampoMeta): Prisma.Sql {
  if (agregacion === "conteo") return Prisma.sql`COUNT(*)`;
  const columna = Prisma.raw(campoY.expr);
  if (agregacion === "suma") return Prisma.sql`SUM(${columna})`;
  return Prisma.sql`AVG(${columna})`;
}

function construirWhere(dataset: DatasetMeta, filtros: Filtro[] | undefined, extra: Prisma.Sql[]): Prisma.Sql {
  const condiciones: Prisma.Sql[] = [...extra];
  for (const filtro of filtros ?? []) {
    const campoFiltro = obtenerCampo(dataset, filtro.campoId);
    if (!campoFiltro || typeof filtro.valor !== "string" || filtro.valor.trim() === "") continue;
    condiciones.push(Prisma.sql`${campoExpr(campoFiltro)} = ${filtro.valor}`);
  }
  return condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
}

function ejeYLabelSimple(agregacion: TipoAgregacion, campoY: CampoMeta): string {
  return agregacion === "conteo" ? "N° de registros" : `${campoY.label} (${AGREGACION_LABEL[agregacion]})`;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("J"))) {
    return NextResponse.json({ error: "No tienes permiso para consultar el motor de BI." }, { status: 403 });
  }

  let body: BiQueryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const dataset = obtenerDataset(body.dataset);
  if (!dataset) return NextResponse.json({ error: "Dataset desconocido." }, { status: 400 });

  const tipoGrafica = body.tipoGrafica;
  const requisitos = REQUISITOS_TIPO_GRAFICA[tipoGrafica];
  if (!requisitos) return NextResponse.json({ error: "Tipo de gráfica desconocido." }, { status: 400 });

  const campoX = obtenerCampo(dataset, body.ejeX);
  if (!campoX) return NextResponse.json({ error: "Eje X desconocido para este dataset." }, { status: 400 });
  if (!campoValidoParaEje(campoX, requisitos.ejeX)) {
    return NextResponse.json({ error: "El campo elegido en eje X no aplica a este tipo de gráfica." }, { status: 400 });
  }

  const agregacion = body.agregacion;
  if (agregacion !== "conteo" && agregacion !== "suma" && agregacion !== "promedio") {
    return NextResponse.json({ error: "Agregación inválida." }, { status: 400 });
  }

  let campoY: CampoMeta | undefined;
  if (requisitos.ejeY !== "ninguno") {
    campoY = obtenerCampo(dataset, body.ejeY);
    if (!campoY) return NextResponse.json({ error: "Eje Y desconocido para este dataset." }, { status: 400 });
    if (!campoValidoParaEje(campoY, requisitos.ejeY)) {
      return NextResponse.json({ error: "El campo elegido en eje Y no aplica a este tipo de gráfica." }, { status: 400 });
    }
    if (tipoGrafica !== "dispersion" && tipoGrafica !== "caja" && !agregacionesDisponibles(campoY).includes(agregacion)) {
      return NextResponse.json({ error: "Esa agregación no aplica al campo elegido en el eje Y." }, { status: 400 });
    }
  }

  let campoSplit: CampoMeta | undefined;
  if (requisitos.requiereSplit) {
    campoSplit = body.ejeSplit ? obtenerCampo(dataset, body.ejeSplit) : undefined;
    if (!campoSplit) return NextResponse.json({ error: "Falta el segundo campo de agrupación." }, { status: 400 });
  }

  try {
    if (tipoGrafica === "histograma") return await consultarHistograma(dataset, campoX, body.filtros);
    if (tipoGrafica === "dispersion") return await consultarDispersion(dataset, campoX, campoY!, body.filtros);
    if (tipoGrafica === "caja") return await consultarCaja(dataset, campoX, campoY!, body.filtros);
    if (tipoGrafica === "piramide") return await consultarPiramide(dataset, campoX, campoY!, agregacion, campoSplit!, body.filtros);
    return await consultarSimple(dataset, campoX, campoY!, agregacion, body.orden, body.filtros);
  } catch (error) {
    console.error("Error en /api/bi/query", error);
    return NextResponse.json({ error: "No se pudo ejecutar la consulta." }, { status: 500 });
  }
}

/** barras, líneas, pie, contador, puntos, divergente, calendario — todas comparten la misma forma GROUP BY campoX. */
async function consultarSimple(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  agregacion: TipoAgregacion,
  orden: TipoOrden | undefined,
  filtros: Filtro[] | undefined
): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const metrica = metricaExpr(agregacion, campoY);
  const where = construirWhere(dataset, filtros, []);
  const ordenExpr = orden === "valor_desc" ? Prisma.sql`${metrica} DESC` : orden === "valor_asc" ? Prisma.sql`${metrica} ASC` : Prisma.sql`${dimensionExpr} ASC`;

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension, ${metrica} AS metrica
    FROM ${Prisma.raw(dataset.from)}
    ${where}
    GROUP BY ${dimensionExpr}
    ORDER BY ${ordenExpr}
  `;

  const filas = await prisma.$queryRaw<{ dimension: string | null; metrica: number | string | null }[]>(query);
  const datos = filas.filter((f) => f.dimension !== null).map((f) => ({ dimension: String(f.dimension), valor: Number(f.metrica ?? 0) }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
    datos,
  });
}

/** Agrupa un campo numérico en N rangos de igual ancho y cuenta filas por rango. */
async function consultarHistograma(dataset: DatasetMeta, campoX: CampoMeta, filtros: Filtro[] | undefined): Promise<NextResponse> {
  const expr = Prisma.raw(campoX.expr);
  const whereBase = construirWhere(dataset, filtros, [Prisma.sql`${expr} IS NOT NULL`]);

  const rangoQuery = Prisma.sql`SELECT MIN(${expr})::float8 AS minimo, MAX(${expr})::float8 AS maximo, COUNT(*)::int AS total FROM ${Prisma.raw(dataset.from)} ${whereBase}`;
  const [rango] = await prisma.$queryRaw<{ minimo: number | null; maximo: number | null; total: number }[]>(rangoQuery);

  if (!rango || rango.total === 0 || rango.minimo === null || rango.maximo === null) {
    return NextResponse.json({ dataset: dataset.id, ejeX: { id: campoX.id, label: campoX.label }, ejeY: { label: "N° de registros" }, datos: [] });
  }

  const { minimo, maximo } = rango;
  const ancho = maximo > minimo ? (maximo - minimo) / BINS_HISTOGRAMA : 1;
  const fmt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
  const bordes = Array.from({ length: BINS_HISTOGRAMA + 1 }, (_, i) => minimo + i * ancho);
  const etiquetas = Array.from({ length: BINS_HISTOGRAMA }, (_, i) => `${fmt.format(bordes[i])}–${fmt.format(bordes[i + 1])}`);

  const casos = etiquetas.map((etiqueta, i) => {
    const esUltimo = i === BINS_HISTOGRAMA - 1;
    return esUltimo
      ? Prisma.sql`WHEN ${expr} >= ${bordes[i]} THEN ${etiqueta}`
      : Prisma.sql`WHEN ${expr} >= ${bordes[i]} AND ${expr} < ${bordes[i + 1]} THEN ${etiqueta}`;
  });
  const binExpr = Prisma.sql`CASE ${Prisma.join(casos, " ")} END`;

  // El CASE con los bordes numéricos como parámetros solo puede aparecer UNA vez en la
  // consulta (Postgres no unifica dos apariciones parametrizadas para el GROUP BY) —
  // por eso se calcula en un CTE y se agrupa por su alias en la consulta externa.
  const query = Prisma.sql`
    WITH datos_bin AS (
      SELECT ${binExpr} AS etiqueta
      FROM ${Prisma.raw(dataset.from)}
      ${whereBase}
    )
    SELECT etiqueta AS dimension, COUNT(*)::int AS metrica
    FROM datos_bin
    GROUP BY etiqueta
  `;
  const filas = await prisma.$queryRaw<{ dimension: string; metrica: number }[]>(query);
  const porEtiqueta = new Map(filas.map((f) => [f.dimension, Number(f.metrica)]));
  const datos = etiquetas.map((etiqueta) => ({ dimension: etiqueta, valor: porEtiqueta.get(etiqueta) ?? 0 }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: "N° de registros" },
    datos,
  });
}

/** Pares (x, y) sin agrupar — para el gráfico de dispersión. */
async function consultarDispersion(dataset: DatasetMeta, campoX: CampoMeta, campoY: CampoMeta, filtros: Filtro[] | undefined): Promise<NextResponse> {
  const exprX = Prisma.raw(campoX.expr);
  const exprY = Prisma.raw(campoY.expr);
  const where = construirWhere(dataset, filtros, [Prisma.sql`${exprX} IS NOT NULL`, Prisma.sql`${exprY} IS NOT NULL`]);

  const query = Prisma.sql`
    SELECT ${exprX}::float8 AS x, ${exprY}::float8 AS y
    FROM ${Prisma.raw(dataset.from)}
    ${where}
    LIMIT ${LIMITE_DISPERSION + 1}
  `;
  const filas = await prisma.$queryRaw<{ x: number; y: number }[]>(query);
  const truncado = filas.length > LIMITE_DISPERSION;
  const datos = filas.slice(0, LIMITE_DISPERSION).map((f) => ({ dimension: String(Number(f.x)), valor: Number(f.y) }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: campoY.label },
    datos,
    truncado,
  });
}

/** Min / Q1 / mediana / Q3 / max por grupo — para el box plot. */
async function consultarCaja(dataset: DatasetMeta, campoX: CampoMeta, campoY: CampoMeta, filtros: Filtro[] | undefined): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const exprY = Prisma.raw(campoY.expr);
  const where = construirWhere(dataset, filtros, [Prisma.sql`${exprY} IS NOT NULL`]);

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension,
      MIN(${exprY})::float8 AS minimo,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${exprY})::float8 AS q1,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${exprY})::float8 AS mediana,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${exprY})::float8 AS q3,
      MAX(${exprY})::float8 AS maximo
    FROM ${Prisma.raw(dataset.from)}
    ${where}
    GROUP BY ${dimensionExpr}
    ORDER BY ${dimensionExpr} ASC
  `;
  const filas = await prisma.$queryRaw<{ dimension: string | null; minimo: number; q1: number; mediana: number; q3: number; maximo: number }[]>(query);
  const cajas = filas
    .filter((f) => f.dimension !== null)
    .map((f) => ({ dimension: String(f.dimension), min: f.minimo, q1: f.q1, mediana: f.mediana, q3: f.q3, max: f.maximo }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: campoY.label },
    cajas,
  });
}

/** Dos series lado a lado por categoría — para la comparación de dos grupos (pirámide). */
async function consultarPiramide(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  agregacion: TipoAgregacion,
  campoSplit: CampoMeta,
  filtros: Filtro[] | undefined
): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const splitExpr = campoExpr(campoSplit);
  const metrica = metricaExpr(agregacion, campoY);
  const where = construirWhere(dataset, filtros, []);

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension, ${splitExpr} AS grupo, ${metrica} AS metrica
    FROM ${Prisma.raw(dataset.from)}
    ${where}
    GROUP BY ${dimensionExpr}, ${splitExpr}
    ORDER BY ${dimensionExpr} ASC
  `;
  const filas = await prisma.$queryRaw<{ dimension: string | null; grupo: string | null; metrica: number | string | null }[]>(query);
  const validas = filas.filter((f) => f.dimension !== null && f.grupo !== null) as { dimension: string; grupo: string; metrica: number | string | null }[];

  const totalPorGrupo = new Map<string, number>();
  for (const f of validas) totalPorGrupo.set(f.grupo, (totalPorGrupo.get(f.grupo) ?? 0) + Number(f.metrica ?? 0));
  const [grupo1, grupo2] = Array.from(totalPorGrupo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  const dimensiones = Array.from(new Set(validas.map((f) => f.dimension)));
  const valorPorCelda = new Map(validas.map((f) => [`${f.dimension}::${f.grupo}`, Number(f.metrica ?? 0)]));
  const pares = dimensiones.map((dimension) => ({
    dimension,
    izquierda: valorPorCelda.get(`${dimension}::${grupo1}`) ?? 0,
    derecha: grupo2 !== undefined ? valorPorCelda.get(`${dimension}::${grupo2}`) ?? 0 : 0,
  }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
    pares,
    splitLabels: [grupo1 ?? "", grupo2 ?? ""],
  });
}
