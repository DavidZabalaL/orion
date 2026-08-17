import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";
import { cachearConsultaBI } from "@/lib/bi/cache";
import {
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  campoValidoParaEje,
  REQUISITOS_TIPO_GRAFICA,
  type TipoAgregacion,
  type TipoGrafica,
  type TipoOrden,
  type CampoMeta,
  type DatasetMeta,
} from "@/lib/bi/metadata";
import {
  type Filtro,
  campoExpr,
  metricaExpr,
  condicionCampoIn,
  construirWhere,
  resolverAlcanceProyecto,
  ejeYLabelSimple,
  ejecutarSimple,
} from "@/lib/bi/motor-consultas";

type TipoAnalisis = "simple" | "variacion" | "cohorte" | "funnel";
type Comparacion = "periodo_anterior" | "mismo_periodo_anio_anterior";

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
  /** "simple" (default, comportamiento actual) | "variacion" (%/YoY) | "cohorte" | "funnel". */
  tipoAnalisis?: TipoAnalisis;
  /** Solo con tipoAnalisis "variacion": contra qué periodo comparar. */
  comparacion?: Comparacion;
  /** Solo con tipoGrafica de serie de tiempo (ejeX fecha_mes/fecha_dia): rellena con 0 los periodos sin datos dentro del rango presente. */
  rellenarHuecos?: boolean;
  /** Solo con tipoAnalisis "funnel": etapas acumulativas, en orden, sobre el mismo dataset. */
  etapas?: { campoId: string; valores: string[] }[];
};

const LIMITE_DISPERSION = 500;
const BINS_HISTOGRAMA = 8;
const MAX_DIMENSIONES_CRUZADO = 200;
const MAX_SERIES_CRUZADO = 30;
const MAX_ETAPAS_FUNNEL = 8;
const VENTANA_COHORTE_MESES = 12;

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await tienePermisoModulo("M"))) {
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

  if (body.proyectoIds !== undefined && !Array.isArray(body.proyectoIds)) {
    return NextResponse.json({ error: "Proyectos elegidos inválidos." }, { status: 400 });
  }

  // "funnel" y "cohorte" tienen su propia forma de solicitud (no usan
  // ejeX/ejeY/tipoGrafica) — se despachan antes de la validación genérica.
  if (body.tipoAnalisis === "funnel") {
    try {
      const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, body.proyectoIds);
      return await consultarFunnel(dataset, body.etapas, body.filtros, alcance, llaveAlcance);
    } catch (error) {
      console.error("Error en /api/bi/query (funnel)", error);
      return NextResponse.json({ error: "No se pudo ejecutar la consulta." }, { status: 500 });
    }
  }
  if (body.tipoAnalisis === "cohorte") {
    if (!dataset.cohorteConfig) return NextResponse.json({ error: "Este dataset no soporta análisis de cohortes." }, { status: 400 });
    try {
      const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, body.proyectoIds);
      return await consultarCohorte(dataset, body.filtros, alcance, llaveAlcance);
    } catch (error) {
      console.error("Error en /api/bi/query (cohorte)", error);
      return NextResponse.json({ error: "No se pudo ejecutar la consulta." }, { status: 500 });
    }
  }

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

  try {
    const { condicion: alcance, llave: llaveAlcance } = await resolverAlcanceProyecto(dataset, body.proyectoIds);
    const filtrosLlave = JSON.stringify(body.filtros ?? []);
    if (body.tipoAnalisis === "variacion") {
      if (campoX.tipo !== "fecha_mes" && campoX.tipo !== "fecha_dia") {
        return NextResponse.json({ error: "La variación por periodo requiere un eje X de fecha." }, { status: 400 });
      }
      return await consultarVariacion(dataset, campoX, campoY!, agregacion, body.comparacion ?? "periodo_anterior", body.filtros, alcance, llaveAlcance, filtrosLlave);
    }
    if (tipoGrafica === "histograma") return await consultarHistograma(dataset, campoX, body.filtros, alcance, llaveAlcance, filtrosLlave);
    if (tipoGrafica === "dispersion") return await consultarDispersion(dataset, campoX, campoY!, body.filtros, alcance, llaveAlcance, filtrosLlave);
    if (tipoGrafica === "caja") return await consultarCaja(dataset, campoX, campoY!, body.filtros, alcance, llaveAlcance, filtrosLlave);
    if (tipoGrafica === "piramide") return await consultarPiramide(dataset, campoX, campoY!, agregacion, campoSplit!, body.filtros, alcance, llaveAlcance, filtrosLlave);
    if (tipoGrafica === "barras" && campoSplit) return await consultarCruzado(dataset, campoX, campoY!, agregacion, campoSplit, body.orden, body.filtros, alcance, llaveAlcance, filtrosLlave);
    return await consultarSimple(dataset, campoX, campoY!, agregacion, body.orden, body.filtros, alcance, llaveAlcance, filtrosLlave, Boolean(body.rellenarHuecos));
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
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string,
  rellenarHuecos = false
): Promise<NextResponse> {
  const resultado = await ejecutarSimple(dataset, campoX, campoY, agregacion, orden, filtros, alcance, llaveAlcance, filtrosLlave, rellenarHuecos);
  return NextResponse.json(resultado);
}

/**
 * Variación %/YoY: misma agregación que consultarSimple, agregando el valor
 * del periodo anterior y del mismo periodo del año anterior vía LAG() sobre
 * la serie ya agrupada — el % de cambio se calcula en TS (evita división
 * por cero en SQL).
 */
async function consultarVariacion(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  agregacion: TipoAgregacion,
  comparacion: Comparacion,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(dataset.id, ["variacion", campoX.id, campoY.id, agregacion, comparacion, filtrosLlave, llaveAlcance], async () => {
    const dimensionExpr = campoExpr(campoX);
    const metrica = metricaExpr(agregacion, campoY);
    const where = construirWhere(dataset, filtros, [alcance]);
    const lagAnio = campoX.tipo === "fecha_dia" ? 365 : 12;

    const query = Prisma.sql`
      WITH serie AS (
        SELECT ${dimensionExpr} AS periodo, ${metrica} AS valor
        FROM ${Prisma.raw(dataset.from)}
        ${where}
        GROUP BY ${dimensionExpr}
      )
      SELECT periodo, valor,
        LAG(valor, 1) OVER (ORDER BY periodo) AS valor_anterior,
        LAG(valor, ${lagAnio}) OVER (ORDER BY periodo) AS valor_anio_anterior
      FROM serie
      WHERE periodo IS NOT NULL
      ORDER BY periodo
    `;
    const filas = await prisma.$queryRaw<{ periodo: string; valor: number | string; valor_anterior: number | string | null; valor_anio_anterior: number | string | null }[]>(query);

    const datos = filas.map((f) => {
      const valor = Number(f.valor ?? 0);
      const comparado = comparacion === "mismo_periodo_anio_anterior" ? f.valor_anio_anterior : f.valor_anterior;
      const valorComparacion = comparado === null || comparado === undefined ? null : Number(comparado);
      const variacionPct = valorComparacion !== null && valorComparacion !== 0 ? (valor - valorComparacion) / valorComparacion : null;
      return { dimension: f.periodo, valor, valorComparacion, variacionPct };
    });

    return {
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
      comparacion,
      datos,
    };
  });

  return NextResponse.json(resultado);
}

/**
 * Funnel: cuenta, para una secuencia ordenada de condiciones sobre el mismo
 * dataset, cuántas filas cumplen cada etapa de forma ACUMULATIVA (etapa N =
 * cumple la condición de la etapa N Y de todas las anteriores). Cada etapa
 * es un filtro más sobre el mismo `from` — mismo mecanismo de validación
 * (`condicionCampoIn`) que los filtros normales, cero SQL nuevo.
 */
async function consultarFunnel(
  dataset: DatasetMeta,
  etapas: { campoId: string; valores: string[] }[] | undefined,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string
): Promise<NextResponse> {
  if (!Array.isArray(etapas) || etapas.length === 0) {
    return NextResponse.json({ error: "Define al menos una etapa para el funnel." }, { status: 400 });
  }
  if (etapas.length > MAX_ETAPAS_FUNNEL) {
    return NextResponse.json({ error: `Máximo ${MAX_ETAPAS_FUNNEL} etapas.` }, { status: 400 });
  }

  const condicionesEtapa: { campoId: string; condicion: Prisma.Sql }[] = [];
  for (const etapa of etapas) {
    const condicion = condicionCampoIn(dataset, etapa.campoId, etapa.valores);
    if (!condicion) return NextResponse.json({ error: `Etapa inválida: ${etapa.campoId}.` }, { status: 400 });
    condicionesEtapa.push({ campoId: etapa.campoId, condicion });
  }

  const filtrosLlave = JSON.stringify(filtros ?? []);
  const etapasLlave = JSON.stringify(etapas);
  const resultado = await cachearConsultaBI(dataset.id, ["funnel", etapasLlave, filtrosLlave, llaveAlcance], async () => {
    const where = construirWhere(dataset, filtros, [alcance]);
    const selects = condicionesEtapa.map((_, i) => {
      const acumuladas = condicionesEtapa.slice(0, i + 1).map((e) => e.condicion);
      return Prisma.sql`COUNT(*) FILTER (WHERE ${Prisma.join(acumuladas, " AND ")})::int AS etapa_${Prisma.raw(String(i))}`;
    });

    const query = Prisma.sql`
      SELECT ${Prisma.join(selects, ", ")}
      FROM ${Prisma.raw(dataset.from)}
      ${where}
    `;
    const [fila] = await prisma.$queryRaw<Record<string, number>[]>(query);

    const etapasResultado = condicionesEtapa.map((e, i) => ({
      campoId: e.campoId,
      valores: etapas[i].valores,
      total: fila ? Number(fila[`etapa_${i}`] ?? 0) : 0,
    }));

    return { dataset: dataset.id, etapas: etapasResultado };
  });

  return NextResponse.json(resultado);
}

/**
 * Cohortes: agrupa entidades por el mes de su fecha de origen (`cohorteConfig.campoOrigenExpr`,
 * ej. mes de alta de la unidad) y mide, para cada mes posterior (0..11), qué
 * fracción de esa cohorte tuvo al menos un evento repetible (`campoEventoExpr`,
 * ej. una carga de combustible) — alcance limitado a cohorte + evento DENTRO
 * del mismo dataset (un `from` = una tabla/join fijo), nunca cross-dataset.
 */
async function consultarCohorte(dataset: DatasetMeta, filtros: Filtro[] | undefined, alcance: Prisma.Sql, llaveAlcance: string): Promise<NextResponse> {
  const config = dataset.cohorteConfig;
  if (!config) return NextResponse.json({ error: "Este dataset no soporta análisis de cohortes." }, { status: 400 });

  const filtrosLlave = JSON.stringify(filtros ?? []);
  const resultado = await cachearConsultaBI(dataset.id, ["cohorte", filtrosLlave, llaveAlcance], async () => {
    const origenExpr = Prisma.raw(config.campoOrigenExpr);
    const eventoExpr = Prisma.raw(config.campoEventoExpr);
    const entidadExpr = Prisma.raw(config.entidadIdExpr);
    const where = construirWhere(dataset, filtros, [alcance, Prisma.sql`${origenExpr} IS NOT NULL`, Prisma.sql`${eventoExpr} IS NOT NULL`]);

    const query = Prisma.sql`
      WITH eventos AS (
        SELECT ${entidadExpr} AS entidad_id,
          date_trunc('month', ${origenExpr})::date AS cohorte,
          date_trunc('month', ${eventoExpr})::date AS periodo
        FROM ${Prisma.raw(dataset.from)}
        ${where}
      ),
      indexado AS (
        SELECT entidad_id, cohorte,
          ((EXTRACT(YEAR FROM periodo) - EXTRACT(YEAR FROM cohorte)) * 12
            + (EXTRACT(MONTH FROM periodo) - EXTRACT(MONTH FROM cohorte)))::int AS periodo_index
        FROM eventos
        WHERE periodo >= cohorte
      ),
      tamanos AS (
        SELECT cohorte, COUNT(DISTINCT entidad_id)::int AS tamano FROM eventos GROUP BY cohorte
      )
      SELECT TO_CHAR(i.cohorte, 'YYYY-MM') AS cohorte, i.periodo_index, COUNT(DISTINCT i.entidad_id)::int AS activos, t.tamano
      FROM indexado i JOIN tamanos t ON t.cohorte = i.cohorte
      WHERE i.periodo_index BETWEEN 0 AND ${VENTANA_COHORTE_MESES - 1}
      GROUP BY i.cohorte, i.periodo_index, t.tamano
      ORDER BY i.cohorte, i.periodo_index
    `;
    const filas = await prisma.$queryRaw<{ cohorte: string; periodo_index: number; activos: number; tamano: number }[]>(query);

    const porCohorte = new Map<string, { tamano: number; retencion: (number | null)[] }>();
    for (const f of filas) {
      if (!porCohorte.has(f.cohorte)) porCohorte.set(f.cohorte, { tamano: f.tamano, retencion: Array(VENTANA_COHORTE_MESES).fill(null) });
      porCohorte.get(f.cohorte)!.retencion[f.periodo_index] = f.tamano > 0 ? f.activos / f.tamano : 0;
    }
    const cohortes = Array.from(porCohorte.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cohorte, v]) => ({ cohorte, tamano: v.tamano, retencion: v.retencion }));

    return { dataset: dataset.id, ventanaMeses: VENTANA_COHORTE_MESES, cohortes };
  });

  return NextResponse.json(resultado);
}

/** Agrupa un campo numérico en N rangos de igual ancho y cuenta filas por rango. */
async function consultarHistograma(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(dataset.id, ["histograma", campoX.id, filtrosLlave, llaveAlcance], async () => {
    const expr = Prisma.raw(campoX.expr);
    const whereBase = construirWhere(dataset, filtros, [alcance, Prisma.sql`${expr} IS NOT NULL`]);

    const rangoQuery = Prisma.sql`SELECT MIN(${expr})::float8 AS minimo, MAX(${expr})::float8 AS maximo, COUNT(*)::int AS total FROM ${Prisma.raw(dataset.from)} ${whereBase}`;
    const [rango] = await prisma.$queryRaw<{ minimo: number | null; maximo: number | null; total: number }[]>(rangoQuery);

    if (!rango || rango.total === 0 || rango.minimo === null || rango.maximo === null) {
      return { dataset: dataset.id, ejeX: { id: campoX.id, label: campoX.label }, ejeY: { label: "N° de registros" }, datos: [] };
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

    return {
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: "N° de registros" },
      datos,
    };
  });

  return NextResponse.json(resultado);
}

/** Pares (x, y) sin agrupar — para el gráfico de dispersión. */
async function consultarDispersion(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(dataset.id, ["dispersion", campoX.id, campoY.id, filtrosLlave, llaveAlcance], async () => {
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

    return {
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: campoY.label },
      datos,
      truncado,
    };
  });

  return NextResponse.json(resultado);
}

/** Min / Q1 / mediana / Q3 / max por grupo — para el box plot. */
async function consultarCaja(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(dataset.id, ["caja", campoX.id, campoY.id, filtrosLlave, llaveAlcance], async () => {
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

    return {
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: campoY.label },
      cajas,
    };
  });

  return NextResponse.json(resultado);
}

/** Dos series lado a lado por categoría — para la comparación de dos grupos (pirámide). */
async function consultarPiramide(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  agregacion: TipoAgregacion,
  campoSplit: CampoMeta,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(
    dataset.id,
    ["piramide", campoX.id, campoY.id, agregacion, campoSplit.id, filtrosLlave, llaveAlcance],
    async () => {
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

      return {
        dataset: dataset.id,
        ejeX: { id: campoX.id, label: campoX.label },
        ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
        pares,
        splitLabels: [grupo1 ?? "", grupo2 ?? ""],
      };
    }
  );

  return NextResponse.json(resultado);
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
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<NextResponse> {
  const resultado = await cachearConsultaBI(
    dataset.id,
    ["cruzado", campoX.id, campoY.id, agregacion, campoSplit.id, orden ?? "", filtrosLlave, llaveAlcance],
    async () => {
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

      return {
        dataset: dataset.id,
        ejeX: { id: campoX.id, label: campoX.label },
        ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
        cruzado: { series, filas: filasCruzadas, truncado: seriesTruncadas || dimensionesTruncadas },
      };
    }
  );

  return NextResponse.json(resultado);
}
