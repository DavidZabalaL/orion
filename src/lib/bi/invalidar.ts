// Invalidación del caché de BI (ver src/lib/bi/cache.ts). Se llama desde los
// Server Actions que escriben en las tablas que alimentan un dataset BI, justo
// después de que la escritura tuvo éxito.
import { revalidateTag } from "next/cache";
import { tagDataset } from "@/lib/bi/cache";

/**
 * Invalida el caché de BI para uno o más datasets. `profile: "expire": 0` fuerza
 * expiración inmediata (en vez de "max"/stale-while-revalidate) porque estas
 * escrituras son poco frecuentes comparadas con las lecturas de dashboards, y
 * preferimos consistencia inmediata sobre servir un resultado obsoleto tras
 * editar un gasto/mantenimiento/etc.
 */
export function invalidarCacheBI(datasetIds: string[]): void {
  for (const id of datasetIds) {
    revalidateTag(tagDataset(id), { expire: 0 });
  }
}
