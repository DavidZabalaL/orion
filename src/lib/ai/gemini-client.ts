// Cliente único de Google Gemini para la capa de IA de BI (Fase 7). Requiere
// GEMINI_API_KEY configurada por el usuario en el entorno — sin ella, las
// rutas que la usan (nl-query, insight, forecast) responden con un error
// claro en vez de tumbar el resto de la app.
import { GoogleGenAI } from "@google/genai";

let cliente: GoogleGenAI | null = null;

export function geminiDisponible(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Lanza un error legible si falta la API key — llamar solo tras confirmar `geminiDisponible()`, o capturar el error. */
export function obtenerClienteGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada. Esta funcionalidad de IA requiere que el administrador la configure.");
  }
  if (!cliente) cliente = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cliente;
}

// Flash: barato/rápido — interpretación de lenguaje natural y explicaciones
// de forecast. Pro: mejor redacción para resúmenes de insight (entrada
// pequeña, ya agregada, así que el costo sigue siendo bajo).
export const MODELO_INTERPRETACION = "gemini-2.5-flash";
export const MODELO_INSIGHT = "gemini-2.5-pro";
