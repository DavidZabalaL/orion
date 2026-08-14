// Genera el schema del tool "interpretar_consulta_bi" (para tool use forzado
// de Anthropic) directamente desde BI_DATASETS — cualquier dataset/campo
// nuevo se refleja solo, sin tocar este archivo. El LLM SOLO puede producir
// estos parámetros; nunca SQL ni nombres de columna libres. La validación
// real (¿existe el dataset? ¿existe el campo en ESE dataset? ¿aplica la
// agregación?) ocurre después, en validar-interpretacion.ts, contra el mismo
// whitelist que usa /api/bi/query — este schema solo acota la forma general
// para que el modelo no alucine una estructura completamente distinta.
import { BI_DATASETS, TIPO_GRAFICA_LABEL } from "@/lib/bi/metadata";

export const NOMBRE_TOOL_INTERPRETAR = "interpretar_consulta_bi";

export function construirToolInterpretarConsulta() {
  const datasetIds = BI_DATASETS.map((d) => d.id);
  const tipoGraficaIds = Object.keys(TIPO_GRAFICA_LABEL);
  const catalogoDatasets = BI_DATASETS.map(
    (d) => `- "${d.id}" (${d.label}): campos disponibles → ${d.campos.map((c) => `${c.id} [${c.tipo}]${c.opciones ? ` valores: ${c.opciones.map((o) => o.valor).join(", ")}` : ""}`).join("; ")}`
  ).join("\n");

  return {
    tool: {
      name: NOMBRE_TOOL_INTERPRETAR,
      description:
        "Traduce una pregunta en lenguaje natural sobre datos de la flota a los parámetros de una consulta de BI ya existente. NUNCA generes SQL. Si la pregunta no se puede responder con los datasets/campos listados, o es ambigua, marca aclaracion_necesaria=true y explica qué falta en pregunta_aclaratoria en vez de inventar un dataset o campo.",
      input_schema: {
        type: "object" as const,
        properties: {
          aclaracion_necesaria: {
            type: "boolean",
            description: "true si la pregunta no se puede mapear a los datasets/campos disponibles, o es ambigua.",
          },
          pregunta_aclaratoria: {
            type: "string",
            description: "Si aclaracion_necesaria es true, una pregunta corta en español para pedirle más detalle al usuario.",
          },
          dataset: { type: "string", enum: datasetIds, description: "id del dataset a consultar." },
          ejeX: { type: "string", description: "id del campo del dataset elegido para agrupar (la dimensión)." },
          ejeY: { type: "string", description: "id del campo del dataset elegido para medir. Si la pregunta es un conteo, puede repetir ejeX." },
          agregacion: { type: "string", enum: ["conteo", "suma", "promedio"], description: "conteo para '¿cuántos...?', suma/promedio solo para campos numéricos." },
          tipoGrafica: { type: "string", enum: tipoGraficaIds, description: "Tipo de visualización más adecuado. 'barras' es un default razonable." },
          filtros: {
            type: "array",
            description: "Filtros adicionales, si la pregunta menciona una condición (ej. 'del proyecto X', 'con estatus vencido').",
            items: {
              type: "object",
              properties: {
                campoId: { type: "string", description: "id de un campo del dataset elegido." },
                valores: { type: "array", items: { type: "string" }, description: "valores literales a filtrar (OR entre ellos)." },
              },
              required: ["campoId", "valores"],
            },
          },
        },
        required: ["aclaracion_necesaria", "dataset", "ejeX", "ejeY", "agregacion", "tipoGrafica"],
      },
    },
    /** Texto para el prompt de sistema: catálogo completo de datasets/campos permitidos, para que el modelo no alucine nombres. */
    catalogoDatasets,
    datasetIds,
    tipoGraficaIds,
  };
}
