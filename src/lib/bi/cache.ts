// Caché de resultados del motor de BI. La llave SIEMPRE debe incluir el
// alcance de proyecto ya resuelto (después de intersectar con los proyectos
// permitidos del rol) — nunca el proyectoIds crudo que mandó el cliente. Si
// no, una respuesta cacheada calculada para un usuario con más permisos
// podría servirse a otro con menos permisos.
//
// Se usa `unstable_cache` (no "use cache"/Cache Components) a propósito: esa
// API nueva requiere `cacheComponents: true` en next.config.ts, un cambio de
// comportamiento a nivel de toda la app (afecta PPR/streaming) que no
// queremos arriesgar solo por el motor de BI.
import { unstable_cache } from "next/cache";

const TTL_RESPALDO_SEGUNDOS = 300;

export function tagDataset(datasetId: string): string {
  return `bi-dataset:${datasetId}`;
}

/**
 * Envuelve `fn` (una consulta a Postgres) con caché por combinación exacta de
 * parámetros. `llave` debe incluir todos los parámetros relevantes de la
 * consulta, incluido el alcance de proyecto ya resuelto.
 */
export function cachearConsultaBI<T>(datasetId: string, llave: (string | number)[], fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, ["bi-query", datasetId, ...llave.map(String)], {
    tags: [tagDataset(datasetId)],
    revalidate: TTL_RESPALDO_SEGUNDOS,
  })();
}
