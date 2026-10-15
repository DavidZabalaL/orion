// Núcleo compartido del motor de consultas BI: helpers de construcción SQL +
// la forma "simple" (GROUP BY 1 dimensión), reutilizados por /api/bi/query y
// por la capa de IA (insight/forecast, Fase 7) para poder re-ejecutar una
// consulta ya validada sin duplicar la lógica de whitelist/RLS. Los demás
// tipos de consulta (histograma, dispersión, caja, pirámide, cruzado,
// variación, funnel, cohorte) siguen viviendo en route.ts — solo se movió lo
// que la capa de IA necesita reutilizar.
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { cachearConsultaBI } from "@/lib/bi/cache";
import { claveMesMx } from "@/lib/timezone";
import {
  obtenerDataset,
  obtenerCampo,
  agregacionesDisponibles,
  AGREGACION_LABEL,
  SENTINEL_MES_ACTUAL,
  SENTINEL_MES_ANTERIOR,
  type TipoAgregacion,
  type TipoOrden,
  type CampoMeta,
  type DatasetMeta,
} from "@/lib/bi/metadata";

export type Filtro = { campoId: string; valores: string[] };

export const MAX_FILTROS = 20;
export const MAX_VALORES_POR_FILTRO = 100;

function resolverValorFiltro(campo: CampoMeta, valor: string): string {
  if (campo.tipo !== "fecha_mes") return valor;
  if (valor === SENTINEL_MES_ACTUAL) return claveMesMx(0);
  if (valor === SENTINEL_MES_ANTERIOR) return claveMesMx(-1);
  return valor;
}

export function campoExpr(campo: CampoMeta): Prisma.Sql {
  if (campo.tipo === "fecha_mes") return Prisma.sql`TO_CHAR(${Prisma.raw(campo.expr)}, 'YYYY-MM')`;
  if (campo.tipo === "fecha_dia") return Prisma.sql`TO_CHAR(${Prisma.raw(campo.expr)}, 'YYYY-MM-DD')`;
  return Prisma.sql`${Prisma.raw(campo.expr)}`;
}

export function metricaExpr(agregacion: TipoAgregacion, campoY: CampoMeta): Prisma.Sql {
  if (agregacion === "conteo") return Prisma.sql`COUNT(*)`;
  const columna = Prisma.raw(campoY.expr);
  if (agregacion === "suma") return Prisma.sql`SUM(${columna})`;
  return Prisma.sql`AVG(${columna})`;
}

/** Condición "campo IN (valores)" para un campo ya validado contra el whitelist del dataset — nunca acepta nombres de columna del cliente, solo `campoId`. */
export function condicionCampoIn(dataset: DatasetMeta, campoId: string, valores: unknown): Prisma.Sql | null {
  const campo = obtenerCampo(dataset, campoId);
  if (!campo || !Array.isArray(valores)) return null;
  const limpios = valores
    .filter((v) => typeof v === "string" && v.trim() !== "")
    .map((v) => resolverValorFiltro(campo, v as string))
    .slice(0, MAX_VALORES_POR_FILTRO);
  if (limpios.length === 0) return null;
  return Prisma.sql`${campoExpr(campo)} IN (${Prisma.join(limpios)})`;
}

export function construirWhere(dataset: DatasetMeta, filtros: Filtro[] | undefined, extra: Prisma.Sql[]): Prisma.Sql {
  const condiciones: Prisma.Sql[] = extra.filter((e) => e !== Prisma.empty);
  for (const filtro of (filtros ?? []).slice(0, MAX_FILTROS)) {
    const condicion = condicionCampoIn(dataset, filtro.campoId, filtro.valores);
    if (condicion) condiciones.push(condicion);
  }
  return condiciones.length > 0 ? Prisma.sql`WHERE ${Prisma.join(condiciones, " AND ")}` : Prisma.empty;
}

export type AlcanceProyecto = {
  condicion: Prisma.Sql;
  /** Representación estable del alcance YA resuelto (no lo que mandó el
   *  cliente) — nunca cachear por proyectoIds crudo, dos usuarios con
   *  distintos permisos podrían pedir el mismo valor y merecer respuestas
   *  distintas. */
  llave: string;
};

/**
 * Alcance de proyecto obligatorio: intersecta lo elegido por el llamador con
 * lo que su rol realmente puede ver (`proyectosPermitidosParaModulo`). Se
 * agrega SIEMPRE como condición WHERE, separada de `filtros`.
 */
export async function resolverAlcanceProyecto(dataset: DatasetMeta, proyectoIdsElegidos: string[] | undefined): Promise<AlcanceProyecto> {
  const permitidos = await proyectosPermitidosParaModulo("M");
  let efectivos: string[] | null = permitidos;
  if (Array.isArray(proyectoIdsElegidos) && proyectoIdsElegidos.length > 0) {
    efectivos = permitidos === null ? proyectoIdsElegidos : proyectoIdsElegidos.filter((id) => permitidos.includes(id));
  }
  if (efectivos === null) return { condicion: Prisma.empty, llave: "ALL" };
  if (efectivos.length === 0) return { condicion: Prisma.sql`FALSE`, llave: "NONE" };
  return { condicion: Prisma.sql`${Prisma.raw(dataset.proyectoScopeExpr)} IN (${Prisma.join(efectivos)})`, llave: [...efectivos].sort().join(",") };
}

export function ejeYLabelSimple(agregacion: TipoAgregacion, campoY: CampoMeta): string {
  return agregacion === "conteo" ? "N° de registros" : `${campoY.label} (${AGREGACION_LABEL[agregacion]})`;
}

/** Sufijo a mostrar junto al valor del eje Y (ej. "%") — vacío en "conteo" porque ahí el valor es N° de registros, no el campo elegido. */
export function ejeYSufijo(agregacion: TipoAgregacion, campoY: CampoMeta): string {
  return agregacion === "conteo" ? "" : campoY.sufijo ?? "";
}

/** Rellena con valor 0 los periodos (mes o día) sin datos entre el mínimo y máximo presentes. */
export function rellenarHuecosPeriodo(datos: { dimension: string; valor: number }[], tipo: "fecha_mes" | "fecha_dia"): { dimension: string; valor: number }[] {
  if (datos.length < 2) return datos;
  const porPeriodo = new Map(datos.map((d) => [d.dimension, d.valor]));
  const primero = datos[0].dimension;
  const ultimo = datos[datos.length - 1].dimension;
  const completos: { dimension: string; valor: number }[] = [];

  if (tipo === "fecha_mes") {
    const [anioInicio, mesInicio] = primero.split("-").map(Number);
    const [anioFin, mesFin] = ultimo.split("-").map(Number);
    const cursor = new Date(Date.UTC(anioInicio, mesInicio - 1, 1));
    const fin = new Date(Date.UTC(anioFin, mesFin - 1, 1));
    while (cursor <= fin) {
      const clave = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
      completos.push({ dimension: clave, valor: porPeriodo.get(clave) ?? 0 });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else {
    const cursor = new Date(`${primero}T00:00:00Z`);
    const fin = new Date(`${ultimo}T00:00:00Z`);
    while (cursor <= fin) {
      const clave = cursor.toISOString().slice(0, 10);
      completos.push({ dimension: clave, valor: porPeriodo.get(clave) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return completos;
}

export type ParamsSimpleValidados = { dataset: DatasetMeta; campoX: CampoMeta; campoY: CampoMeta; agregacion: TipoAgregacion };

/**
 * Validación genérica para consumidores que solo necesitan la forma "simple"
 * (GROUP BY 1 dimensión) — usado por la capa de IA (insight/forecast), que no
 * pasa por tipoGrafica. Mismo whitelist que /api/bi/query (obtenerDataset/
 * obtenerCampo/agregacionesDisponibles), sin las reglas específicas de cada
 * tipo de gráfica.
 */
export function validarParamsSimple(datasetId: string, ejeXId: string, ejeYId: string, agregacion: string): ParamsSimpleValidados | null {
  const dataset = obtenerDataset(datasetId);
  if (!dataset) return null;
  const campoX = obtenerCampo(dataset, ejeXId);
  const campoY = obtenerCampo(dataset, ejeYId);
  if (!campoX || !campoY) return null;
  if (agregacion !== "conteo" && agregacion !== "suma" && agregacion !== "promedio") return null;
  if (!agregacionesDisponibles(campoY).includes(agregacion)) return null;
  return { dataset, campoX, campoY, agregacion };
}

export const MAX_COLUMNAS_TABLA = 15;
export const MAX_FILAS_TABLA = 500;

/** Valida una lista de campoIds para el widget "tabla_filas" — mismo whitelist que cualquier otro campo (obtenerCampo), nunca nombres de columna crudos del cliente. */
export function validarColumnasTabla(dataset: DatasetMeta, columnaIds: unknown): CampoMeta[] | null {
  if (!Array.isArray(columnaIds) || columnaIds.length === 0 || columnaIds.length > MAX_COLUMNAS_TABLA) return null;
  const campos: CampoMeta[] = [];
  for (const id of columnaIds) {
    if (typeof id !== "string") return null;
    const campo = obtenerCampo(dataset, id);
    if (!campo) return null;
    campos.push(campo);
  }
  return campos;
}

export type ResultadoTablaFilas = {
  dataset: string;
  columnas: { id: string; label: string; tipo: string; sufijo: string }[];
  filas: Record<string, string | number | null>[];
  truncado: boolean;
};

/** Núcleo de la consulta "tabla_filas": SELECT de columnas libres, una fila = un registro (sin GROUP BY) — usado por /api/bi/query para el widget de tabla del dashboard personalizado. */
export async function ejecutarTablaFilas(
  dataset: DatasetMeta,
  columnas: CampoMeta[],
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<ResultadoTablaFilas> {
  return cachearConsultaBI(dataset.id, ["tabla_filas", columnas.map((c) => c.id).join(","), filtrosLlave, llaveAlcance], async () => {
    const selects = columnas.map((c) => Prisma.sql`${campoExpr(c)} AS ${Prisma.raw(`"${c.id}"`)}`);
    const where = construirWhere(dataset, filtros, [alcance]);
    const query = Prisma.sql`
      SELECT ${Prisma.join(selects, ", ")}
      FROM ${Prisma.raw(dataset.from)}
      ${where}
      ORDER BY ${campoExpr(columnas[0])} ASC
      LIMIT ${MAX_FILAS_TABLA + 1}
    `;
    const filas = await prisma.$queryRaw<Record<string, string | number | null>[]>(query);
    return {
      dataset: dataset.id,
      columnas: columnas.map((c) => ({ id: c.id, label: c.label, tipo: c.tipo, sufijo: c.sufijo ?? "" })),
      filas: filas.slice(0, MAX_FILAS_TABLA),
      truncado: filas.length > MAX_FILAS_TABLA,
    };
  });
}

export type ResultadoSimple = {
  dataset: string;
  ejeX: { id: string; label: string };
  ejeY: { label: string; sufijo: string };
  datos: { dimension: string; valor: number }[];
};

/** Núcleo de "consultarSimple" (GROUP BY 1 dimensión) sin envolver en NextResponse — usado por /api/bi/query y por la capa de IA. */
export async function ejecutarSimple(
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
): Promise<ResultadoSimple> {
  const rellenarAplicable = rellenarHuecos && (orden === undefined || orden === "dimension") && (campoX.tipo === "fecha_mes" || campoX.tipo === "fecha_dia");
  return cachearConsultaBI(
    dataset.id,
    ["simple", campoX.id, campoY.id, agregacion, orden ?? "", filtrosLlave, llaveAlcance, rellenarAplicable ? "rellenar" : ""],
    async () => {
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
      // Un promedio NULL es "sin datos" (ej. rendimiento real de una marca sin
      // cargas válidas), no 0: mostrarlo como 0 sugeriría un valor real.
      let datos = filas
        .filter((f) => f.dimension !== null && !(agregacion === "promedio" && f.metrica === null))
        .map((f) => ({ dimension: String(f.dimension), valor: Number(f.metrica ?? 0) }));
      if (rellenarAplicable) datos = rellenarHuecosPeriodo(datos, campoX.tipo as "fecha_mes" | "fecha_dia");

      return {
        dataset: dataset.id,
        ejeX: { id: campoX.id, label: campoX.label },
        ejeY: { label: ejeYLabelSimple(agregacion, campoY), sufijo: ejeYSufijo(agregacion, campoY) },
        datos,
      };
    }
  );
}

const MAX_DIMENSIONES_CRUZADO = 200;
const MAX_SERIES_CRUZADO = 30;

export type ResultadoAvance = {
  dataset: string;
  ejeX: { id: string; label: string };
  ejeY: { label: string; sufijo: string };
  ejeMeta: { label: string; sufijo: string };
  datos: { dimension: string; valor: number; meta: number }[];
};

/** Barra de avance (valor vs. meta, ambos sumados) por dimensión — usado por /api/bi/query y por el reporte con vista de dashboard. */
export async function ejecutarAvance(
  dataset: DatasetMeta,
  campoX: CampoMeta,
  campoY: CampoMeta,
  campoMeta: CampoMeta,
  filtros: Filtro[] | undefined,
  alcance: Prisma.Sql,
  llaveAlcance: string,
  filtrosLlave: string
): Promise<ResultadoAvance> {
  return cachearConsultaBI(dataset.id, ["avance", campoX.id, campoY.id, campoMeta.id, filtrosLlave, llaveAlcance], async () => {
    const dimensionExpr = campoExpr(campoX);
    const valorExpr = Prisma.sql`SUM(${Prisma.raw(campoY.expr)})`;
    const metaExpr = Prisma.sql`SUM(${Prisma.raw(campoMeta.expr)})`;
    const where = construirWhere(dataset, filtros, [alcance]);

    const query = Prisma.sql`
      SELECT ${dimensionExpr} AS dimension, ${valorExpr} AS valor, ${metaExpr} AS meta
      FROM ${Prisma.raw(dataset.from)}
      ${where}
      GROUP BY ${dimensionExpr}
      ORDER BY ${dimensionExpr} ASC
    `;
    const filas = await prisma.$queryRaw<{ dimension: string | null; valor: number | string | null; meta: number | string | null }[]>(query);
    const datos = filas.filter((f) => f.dimension !== null).map((f) => ({ dimension: String(f.dimension), valor: Number(f.valor ?? 0), meta: Number(f.meta ?? 0) }));

    return {
      dataset: dataset.id,
      ejeX: { id: campoX.id, label: campoX.label },
      ejeY: { label: campoY.label, sufijo: campoY.sufijo ?? "" },
      ejeMeta: { label: campoMeta.label, sufijo: campoMeta.sufijo ?? "" },
      datos,
    };
  });
}

export type ResultadoCruzado = {
  dataset: string;
  ejeX: { id: string; label: string };
  ejeY: { label: string; sufijo: string };
  cruzado: { series: string[]; filas: { dimension: string; valores: Record<string, number> }[]; truncado: boolean };
};

/** Tabla cruzada (dimensión × segundo grupo) — barras agrupadas / tabla dinámica; usado por /api/bi/query y por el reporte con vista de dashboard. */
export async function ejecutarCruzado(
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
): Promise<ResultadoCruzado> {
  return cachearConsultaBI(
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
        ejeY: { label: ejeYLabelSimple(agregacion, campoY), sufijo: ejeYSufijo(agregacion, campoY) },
        cruzado: { series, filas: filasCruzadas, truncado: seriesTruncadas || dimensionesTruncadas },
      };
    }
  );
}
