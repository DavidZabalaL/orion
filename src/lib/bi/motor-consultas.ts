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
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, AGREGACION_LABEL, type TipoAgregacion, type TipoOrden, type CampoMeta, type DatasetMeta } from "@/lib/bi/metadata";

export type Filtro = { campoId: string; valores: string[] };

export const MAX_FILTROS = 20;
export const MAX_VALORES_POR_FILTRO = 100;

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
  const limpios = valores.filter((v) => typeof v === "string" && v.trim() !== "").slice(0, MAX_VALORES_POR_FILTRO);
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
  const permitidos = await proyectosPermitidosParaModulo("J");
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

export type ResultadoSimple = {
  dataset: string;
  ejeX: { id: string; label: string };
  ejeY: { label: string };
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
      let datos = filas.filter((f) => f.dimension !== null).map((f) => ({ dimension: String(f.dimension), valor: Number(f.metrica ?? 0) }));
      if (rellenarAplicable) datos = rellenarHuecosPeriodo(datos, campoX.tipo as "fecha_mes" | "fecha_dia");

      return {
        dataset: dataset.id,
        ejeX: { id: campoX.id, label: campoX.label },
        ejeY: { label: ejeYLabelSimple(agregacion, campoY) },
        datos,
      };
    }
  );
}
