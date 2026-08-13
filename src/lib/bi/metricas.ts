// Capa semántica: resuelve una MetricaBI guardada a los mismos parámetros
// que ya acepta /api/bi/query. NUNCA construye SQL aquí — solo produce
// { datasetId, campoId, agregacion, filtrosBase } que el explorador aplica
// a sus propios controles (dataset/ejeY/agregación/filtros), y que el
// backend vuelve a validar contra BI_DATASETS exactamente igual que
// cualquier otra combinación armada a mano. Esto preserva el invariante de
// que todo pasa por el whitelist, sin importar si vino de una métrica
// guardada o de un selector libre.
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, type TipoAgregacion, type FiltroGuardable } from "@/lib/bi/metadata";

export type MetricaBIRow = {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string | null;
  datasetId: string;
  campoId: string;
  agregacion: string;
  filtrosBaseJson: unknown;
  activo: boolean;
};

export type MetricaResuelta = {
  datasetId: string;
  campoId: string;
  agregacion: TipoAgregacion;
  filtrosBase: FiltroGuardable[];
};

const AGREGACIONES_VALIDAS: TipoAgregacion[] = ["conteo", "suma", "promedio"];

function parsearFiltrosBase(json: unknown): FiltroGuardable[] {
  if (!Array.isArray(json)) return [];
  const limpios: FiltroGuardable[] = [];
  for (const f of json) {
    if (!f || typeof f !== "object") continue;
    const { campoId, valores } = f as Record<string, unknown>;
    if (typeof campoId !== "string" || !Array.isArray(valores)) continue;
    const valoresLimpios = valores.filter((v): v is string => typeof v === "string");
    if (valoresLimpios.length === 0) continue;
    limpios.push({ campoId, valores: valoresLimpios });
  }
  return limpios;
}

/**
 * Valida una MetricaBI contra el catálogo actual (que puede haber cambiado
 * desde que se creó la métrica) y la resuelve a parámetros de consulta.
 * Devuelve `null` si el dataset/campo ya no existe o la agregación no aplica
 * — nunca produce parámetros a medias.
 */
export function resolverMetrica(metrica: MetricaBIRow): MetricaResuelta | null {
  if (!metrica.activo) return null;
  if (!AGREGACIONES_VALIDAS.includes(metrica.agregacion as TipoAgregacion)) return null;

  const dataset = obtenerDataset(metrica.datasetId);
  if (!dataset) return null;

  const campo = obtenerCampo(dataset, metrica.campoId);
  if (!campo) return null;

  const agregacion = metrica.agregacion as TipoAgregacion;
  if (!agregacionesDisponibles(campo).includes(agregacion)) return null;

  return {
    datasetId: dataset.id,
    campoId: campo.id,
    agregacion,
    filtrosBase: parsearFiltrosBase(metrica.filtrosBaseJson),
  };
}

/** Validación server-side al crear/editar una métrica — mismo criterio que resolverMetrica. */
export function metricaEsValida(datasetId: string, campoId: string, agregacion: string): boolean {
  const dataset = obtenerDataset(datasetId);
  if (!dataset) return false;
  const campo = obtenerCampo(dataset, campoId);
  if (!campo) return false;
  if (!AGREGACIONES_VALIDAS.includes(agregacion as TipoAgregacion)) return false;
  return agregacionesDisponibles(campo).includes(agregacion as TipoAgregacion);
}
