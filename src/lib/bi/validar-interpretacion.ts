// Segunda línea de defensa (la primera es el schema del tool en nl-schema.ts):
// valida con Zod la forma del JSON que produjo el modelo y, más importante,
// revalida cada dataset/campo/agregación contra el whitelist real de
// BI_DATASETS — el mismo que usa /api/bi/query. El LLM nunca tiene un camino
// directo a SQL: en el peor caso, produce parámetros que esta función
// rechaza, nunca parámetros que se ejecuten sin pasar por aquí.
import { z } from "zod";
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, campoValidoParaEje, REQUISITOS_TIPO_GRAFICA, type TipoAgregacion, type TipoGrafica } from "@/lib/bi/metadata";

const FiltroSchema = z.object({
  campoId: z.string(),
  valores: z.array(z.string()).max(100),
});

export const InterpretacionSchema = z.object({
  aclaracion_necesaria: z.boolean(),
  pregunta_aclaratoria: z.string().optional(),
  dataset: z.string(),
  ejeX: z.string(),
  ejeY: z.string(),
  agregacion: z.enum(["conteo", "suma", "promedio"]),
  tipoGrafica: z.string(),
  filtros: z.array(FiltroSchema).max(20).optional(),
});

export type Interpretacion = z.infer<typeof InterpretacionSchema>;

export type ParametrosBIValidados = {
  dataset: string;
  ejeX: string;
  ejeY: string;
  agregacion: TipoAgregacion;
  tipoGrafica: TipoGrafica;
  filtros?: { campoId: string; valores: string[] }[];
};

export type ResultadoValidacion = { ok: true; params: ParametrosBIValidados } | { ok: false; motivo: string };

/**
 * Valida la interpretación del modelo contra el catálogo real. Rechaza (no
 * "corrige") cualquier dataset/campo/agregación/tipoGrafica que no exista o
 * no aplique — nunca se ejecuta SQL con parámetros no validados aquí.
 */
export function validarInterpretacion(raw: unknown): ResultadoValidacion {
  const parsed = InterpretacionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, motivo: "El modelo no devolvió una interpretación con la forma esperada." };
  const interpretacion = parsed.data;

  if (interpretacion.aclaracion_necesaria) {
    return { ok: false, motivo: interpretacion.pregunta_aclaratoria || "No se pudo interpretar la pregunta con los datos disponibles." };
  }

  const dataset = obtenerDataset(interpretacion.dataset);
  if (!dataset) return { ok: false, motivo: `Dataset desconocido: "${interpretacion.dataset}".` };

  const requisitos = REQUISITOS_TIPO_GRAFICA[interpretacion.tipoGrafica as TipoGrafica];
  if (!requisitos) return { ok: false, motivo: `Tipo de gráfica desconocido: "${interpretacion.tipoGrafica}".` };

  const campoX = obtenerCampo(dataset, interpretacion.ejeX);
  if (!campoX) return { ok: false, motivo: `El campo "${interpretacion.ejeX}" no existe en el dataset "${dataset.label}".` };
  if (!campoValidoParaEje(campoX, requisitos.ejeX)) {
    return { ok: false, motivo: `El campo "${campoX.label}" no aplica como eje X para una gráfica de tipo "${interpretacion.tipoGrafica}".` };
  }

  let campoY = campoX;
  if (requisitos.ejeY !== "ninguno") {
    const c = obtenerCampo(dataset, interpretacion.ejeY);
    if (!c) return { ok: false, motivo: `El campo "${interpretacion.ejeY}" no existe en el dataset "${dataset.label}".` };
    campoY = c;
    if (!campoValidoParaEje(campoY, requisitos.ejeY)) {
      return { ok: false, motivo: `El campo "${campoY.label}" no aplica como eje Y para una gráfica de tipo "${interpretacion.tipoGrafica}".` };
    }
    if (!agregacionesDisponibles(campoY).includes(interpretacion.agregacion)) {
      return { ok: false, motivo: `La agregación "${interpretacion.agregacion}" no aplica al campo "${campoY.label}".` };
    }
  }

  for (const filtro of interpretacion.filtros ?? []) {
    if (!obtenerCampo(dataset, filtro.campoId)) {
      return { ok: false, motivo: `El filtro hace referencia a un campo inexistente: "${filtro.campoId}".` };
    }
  }

  return {
    ok: true,
    params: {
      dataset: dataset.id,
      ejeX: campoX.id,
      ejeY: campoY.id,
      agregacion: interpretacion.agregacion,
      tipoGrafica: interpretacion.tipoGrafica as TipoGrafica,
      filtros: interpretacion.filtros,
    },
  };
}
