import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
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

type Filtro = { campoId: string; valores: string[] };

type BiQueryBody = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  ejeSplit?: string;
  orden?: TipoOrden;
  filtros?: Filtro[];
  proyectoIds?: string[];
};

const LIMITE_DISPERSION = 500;
const BINS_HISTOGRAMA = 8;
const MAX_FILTROS = 20;
const MAX_VALORES_POR_FILTRO = 100;
const MAX_DIMENSIONES_CRUZADO = 200;
const MAX_SERIES_CRUZADO = 30;

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
  // `extra` puede traer Prisma.empty (p. ej. condicionAlcanceProyecto() para un
  // rol global, sin restricción) — se filtra aquí, si no, un solo elemento vacío
  // hace que condiciones.length sea > 0 y se emita "WHERE " sin nada detrás.
  const condiciones: Prisma.Sql[] = extra.filter((e) => e !== Prisma.empty);
  for (const filtro of (filtros ?? []).slice(0, MAX_FILTROS)) {
    const campoFiltro = obtenerCampo(dataset, filtro.campoId);
    if (!campoFiltro || !Array.isArray(filtro.valores)) continue;
    const limpios = filtro.valores.filter((v) => typeof v === "string" && v.trim() !== "").slice(0, MAX_VALORES_POR_FILTRO);
    if (limpios.length === 0) continue;
    condiciones.push(Prisma.sql`${campoExpr(campoFiltro)} IN (${Prisma.join(limpios)})`);
  }
  return condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
}

/**
 * Alcance de proyecto obligatorio: intersecta lo elegido por quien arma el
 * widget (si acotó a proyectos específicos) con lo que su rol realmente
 * puede ver (`proyectosPermitidosParaModulo`). Se calcula en el servidor y se
 * agrega SIEMPRE como condición WHERE, separada de `filtros` — un filtro de
 * usuario sobre el campo "proyecto" (que lee de dataset.campos) nunca puede
 * sustituir ni ampliar este alcance.
 */
async function condicionAlcanceProyecto(dataset: DatasetMeta, proyectoIdsElegidos: string[] | undefined): Promise<Prisma.Sql> {
  const permitidos = await proyectosPermitidosParaModulo("J");
  let efectivos: string[] | null = permitidos;
  if (Array.isArray(proyectoIdsElegidos) && proyectoIdsElegidos.length > 0) {
    efectivos = permitidos === null ? proyectoIdsElegidos : proyectoIdsElegidos.filter((id) => permitidos.includes(id));
  }
  if (efectivos === null) return Prisma.empty;
  if (efectivos.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`${Prisma.raw(dataset.proyectoScopeExpr)} IN (${Prisma.join(efectivos)})`;
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
  if (requisitos.ejeSplit) {
    campoSplit = body.ejeSplit ? obtenerCampo(dataset, body.ejeSplit) : undefined;
    if (requisitos.ejeSplit.obligatorio && !campoSplit) {
      return NextResponse.json({ error: "Falta el segundo campo de agrupación." }, { status: 400 });
    }
    if (campoSplit && !campoValidoParaEje(campoSplit, requisitos.ejeSplit.tipos)) {
      return NextResponse.json({ error: "El campo elegido como segundo grupo no aplica a este tipo de gráfica." }, { status: 400 });
    }
  }

  if (body.proyectoIds !== undefined && !Array.isArray(body.proyectoIds)) {
    return NextResponse.json({ error: "Proyectos elegidos inválidos." }, { status: 400 });
  }

  try {
    const alcance = await condicionAlcanceProyecto(dataset, body.proyectoIds);
    if (tipoGrafica === "histograma") return await consultarHistograma(dataset, campoX, body.filtros, alcance);
    if (tipoGrafica === "dispersion") return await consultarDispersion(dataset, campoX, campoY!, body.filtros, alcance);
    if (tipoGrafica === "caja") return await consultarCaja(dataset, campoX, campoY!, body.filtros, alcance);
    if (tipoGrafica === "piramide") return await consultarPiramide(dataset, campoX, campoY!, agregacion, campoSplit!, body.filtros, alcance);
    if (tipoGrafica === "barras" && campoSplit) return await consultarCruzado(dataset, campoX, campoY!, agregacion, campoSplit, body.orden, body.filtros, alcance);
    return await consultarSimple(dataset, campoX, campoY!, agregacion, body.orden, body.filtros, alcance);
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
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql
): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const metrica = metricaExpr(agregacion, campoY);
  const where = construirWhere(dataset, filtros, [alcance]);
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
async function consultarHistograma(dataset: DatasetMeta, campoX: CampoMeta, filtros: Filtro[] | undefined, alcance: Prisma.Sql): Promise<NextResponse> {
  const expr = Prisma.raw(campoX.expr);
  const whereBase = construirWhere(dataset, filtros, [alcance, Prisma.sql`${expr} IS NOT NULL`]);

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
async function consultarDispersion(dataset: DatasetMeta, campoX: CampoMeta, campoY: CampoMeta, filtros: Filtro[] | undefined, alcance: Prisma.Sql): Promise<NextResponse> {
  const exprX = Prisma.raw(campoX.expr);
  const exprY = Prisma.raw(campoY.expr);
  const where = construirWhere(dataset, filtros, [alcance, Prisma.sql`${exprX} IS NOT NULL`, Prisma.sql`${exprY} IS NOT NULL`]);

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
async function consultarCaja(dataset: DatasetMeta, campoX: CampoMeta, campoY: CampoMeta, filtros: Filtro[] | undefined, alcance: Prisma.Sql): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const exprY = Prisma.raw(campoY.expr);
  const where = construirWhere(dataset, filtros, [alcance, Prisma.sql`${exprY} IS NOT NULL`]);

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
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql
): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const splitExpr = campoExpr(campoSplit);
  const metrica = metricaExpr(agregacion, campoY);
  const where = construirWhere(dataset, filtros, [alcance]);

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

/**
 * Cruce general de 2 dimensiones (sin tope de categorías, a diferencia de
 * `consultarPiramide`): agrupa por campoX y campoSplit a la vez y arma una
 * tabla { dimension, valores: {serie: numero} } — alimenta tanto la vista de
 * barras agrupadas como la de tabla cruzada.
 */
async function consultarCruzado(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  agregacion: TipoAgregacion,
  campoSplit: CampoMeta,
  orden: TipoOrden | undefined,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql
): Promise<NextResponse> {
  const dimensionExpr = campoExpr(campoX);
  const splitExpr = campoExpr(campoSplit);
  const metrica = metricaExpr(agregacion, campoY);
  const where = construirWhere(dataset, filtros, [alcance]);

  const query = Prisma.sql`
    SELECT ${dimensionExpr} AS dimension, ${splitExpr} AS grupo, ${metrica} AS metrica
    FROM ${Prisma.raw(dataset.from)}
    ${where}
    GROUP BY ${dimensionExpr}, ${splitExpr}
  `;
  const filas = await prisma.$queryRaw<{ dimension: string | null; grupo: string | null; metrica: number | string | null }[]>(query);
  const validas = filas.filter((f) => f.dimension !== null && f.grupo !== null) as { dimension: string; grupo: string; metrica: number | string | null }[];

  const totalPorGrupo = new Map<string, number>();
  for (const f of validas) totalPorGrupo.set(f.grupo, (totalPorGrupo.get(f.grupo) ?? 0) + Number(f.metrica ?? 0));
  const seriesOrdenadas = Array.from(totalPorGrupo.entries()).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const seriesTruncadas = seriesOrdenadas.length > MAX_SERIES_CRUZADO;
  const series = seriesOrdenadas.slice(0, MAX_SERIES_CRUZADO);
  const seriesSet = new Set(series);

  const metricaPorDimension = new Map<string, number>();
  for (const f of validas) if (seriesSet.has(f.grupo)) metricaPorDimension.set(f.dimension, (metricaPorDimension.get(f.dimension) ?? 0) + Number(f.metrica ?? 0));
  const dimensionesUnicas = Array.from(new Set(validas.map((f) => f.dimension)));
  const dimensionesOrdenadas =
    orden === "valor_desc"
      ? [...dimensionesUnicas].sort((a, b) => (metricaPorDimension.get(b) ?? 0) - (metricaPorDimension.get(a) ?? 0))
      : orden === "valor_asc"
      ? [...dimensionesUnicas].sort((a, b) => (metricaPorDimension.get(a) ?? 0) - (metricaPorDimension.get(b) ?? 0))
      : [...dimensionesUnicas].sort();
  const dimensionesTruncadas = dimensionesOrdenadas.length > MAX_DIMENSIONES_CRUZADO;
  const dimensiones = dimensionesOrdenadas.slice(0, MAX_DIMENSIONES_CRUZADO);

  const valorPorCelda = new Map(validas.map((f) => [`${f.dimension}::${f.grupo}`, Number(f.metrica ?? 0)]));
  const filasCruzadas = dimensiones.map((dimension) => ({
    dimension,
    valores: Object.fromEntries(series.map((s) => [s, valorPorCelda.get(`${dimension}::${s}`) ?? 0])),
  }));

  return NextResponse.json({
    dataset: dataset.id,
    ejeX: { id: campoX.id, label: campoX.label },
    ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
    cruzado: { series, filas: filasCruzadas, truncado: seriesTruncadas || dimensionesTruncadas },
  });
}
