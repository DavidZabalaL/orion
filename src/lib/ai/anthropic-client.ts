// Cliente único de Anthropic para la capa de IA de BI (Fase 7). Requiere
// ANTHROPIC_API_KEY configurada por el usuario en el entorno — sin ella, las
// rutas que la usan (nl-query, insight, forecast) responden con un error
// claro en vez de tumbar el resto de la app.
import Anthropic from "@anthropic-ai/sdk";

let cliente: Anthropic | null = null;

export function anthropicDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Lanza un error legible si falta la API key — llamar solo tras confirmar `anthropicDisponible()`, o capturar el error. */
export function obtenerClienteAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY no está configurada. Esta funcionalidad de IA requiere que el administrador la configure.");
  }
  if (!cliente) cliente = new Anthropic();
  return cliente;
}

// Baratos/rápidos: interpretación de lenguaje natural y explicaciones de
// forecast. Sonnet: redacción de resúmenes de insight (entrada pequeña, ya
// agregada, así que el costo sigue siendo bajo).
export const MODELO_INTERPRETACION = "claude-haiku-4-5";
export const MODELO_INSIGHT = "claude-sonnet-5";
