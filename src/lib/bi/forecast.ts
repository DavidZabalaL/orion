// Forecasting determinista (regresión lineal, media móvil, z-score para
// anomalías) — deliberadamente SIN LLM: es más barato, determinista y
// auditable que pedirle a un modelo que "prediga números". El LLM (en la ruta
// que llama a estas funciones) solo redacta la explicación de estos
// resultados ya calculados, nunca los calcula ni los corrige.

export type PuntoSerie = { dimension: string; valor: number };
export type Anomalia = { dimension: string; valor: number; zScore: number };

/** Ajuste y = intercepto + pendiente*x sobre x = 0..n-1 (mínimos cuadrados). */
export function regresionLinealSimple(valores: number[]): { pendiente: number; intercepto: number } {
  const n = valores.length;
  if (n < 2) return { pendiente: 0, intercepto: valores[0] ?? 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = valores.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mediaX) * (valores[i] - mediaY);
    den += (xs[i] - mediaX) ** 2;
  }
  const pendiente = den === 0 ? 0 : num / den;
  const intercepto = mediaY - pendiente * mediaX;
  return { pendiente, intercepto };
}

/** Proyecta `periodos` puntos adicionales siguiendo la recta ajustada — nunca negativo (no aplica a magnitudes físicas como conteos, litros, costos). */
export function proyectar(valores: number[], periodos: number): number[] {
  const { pendiente, intercepto } = regresionLinealSimple(valores);
  return Array.from({ length: periodos }, (_, i) => {
    const x = valores.length + i;
    return Math.max(0, intercepto + pendiente * x);
  });
}

export function mediaMovil(valores: number[], ventana: number): (number | null)[] {
  return valores.map((_, i) => {
    if (i < ventana - 1) return null;
    const tramo = valores.slice(i - ventana + 1, i + 1);
    return tramo.reduce((a, b) => a + b, 0) / tramo.length;
  });
}

/** Anomalías por z-score sobre la media/desviación de toda la serie — umbral |z| > 2. */
export function detectarAnomalias(serie: PuntoSerie[]): Anomalia[] {
  if (serie.length < 3) return [];
  const valores = serie.map((p) => p.valor);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  const varianza = valores.reduce((a, b) => a + (b - media) ** 2, 0) / valores.length;
  const desviacion = Math.sqrt(varianza);
  if (desviacion === 0) return [];
  return serie
    .map((p) => ({ dimension: p.dimension, valor: p.valor, zScore: (p.valor - media) / desviacion }))
    .filter((a) => Math.abs(a.zScore) > 2);
}

export function tendencia(valores: number[]): "creciente" | "decreciente" | "estable" {
  const { pendiente } = regresionLinealSimple(valores);
  const media = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);
  const umbral = Math.abs(media) * 0.02; // cambio relativo menor al 2% por periodo se considera estable
  if (pendiente > umbral) return "creciente";
  if (pendiente < -umbral) return "decreciente";
  return "estable";
}
