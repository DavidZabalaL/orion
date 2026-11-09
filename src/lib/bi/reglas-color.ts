// Reglas de color condicional configurables para las tablas del Explorador
// BI (TablaSimple / BiTablaCruzada) — semáforo por valor, aplicado en el
// cliente al visualizar (no cambia la consulta ni se manda al servidor).
// "Personalizada" es una comparación simple (ej. ">=100") parseada con un
// whitelist de operadores fijo — nunca se evalúa como código (sin eval()).

export type OperadorReglaColor =
  | "mayor"
  | "menor"
  | "igual"
  | "entre"
  | "personalizada"
  | "sobre_promedio"
  | "bajo_promedio"
  | "mayor_que_columna"
  | "menor_que_columna";

export type ReglaColorColumna = {
  id: string;
  /** Nombre de la columna/serie a la que aplica — "" (vacío) = todas las columnas numéricas de la tabla. */
  columna: string;
  operador: OperadorReglaColor;
  valor?: number;
  valorMin?: number;
  valorMax?: number;
  expresion?: string;
  /** Solo con "mayor_que_columna"/"menor_que_columna": otra columna de la MISMA fila contra la que se compara (ej. rendimiento real vs. rendimiento de ficha técnica). */
  columnaComparada?: string;
  color: string;
};

/** Valores numéricos de una fila por nombre de columna — para las reglas que comparan contra otra columna. */
export type FilaValores = Record<string, number | null | undefined>;

export const OPERADOR_REGLA_COLOR_LABEL: Record<OperadorReglaColor, string> = {
  mayor: "Mayor que",
  menor: "Menor que",
  igual: "Igual a",
  entre: "Entre",
  personalizada: "Personalizada",
  sobre_promedio: "Por arriba del promedio",
  bajo_promedio: "Por debajo del promedio",
  mayor_que_columna: "Mayor que otra columna",
  menor_que_columna: "Menor que otra columna",
};

/** Operadores que comparan contra otra columna de la fila (necesitan `columnaComparada` y una tabla con varias columnas). */
export const OPERADORES_CONTRA_COLUMNA: OperadorReglaColor[] = ["mayor_que_columna", "menor_que_columna"];

export const COLORES_REGLA_PRESET: { valor: string; label: string }[] = [
  { valor: "#dc2626", label: "Rojo" },
  { valor: "#16a34a", label: "Verde" },
  { valor: "#d97706", label: "Ámbar" },
  { valor: "#2b7fff", label: "Azul" },
  { valor: "#6b7785", label: "Gris" },
];

const OPERADORES_EXPRESION: { simbolo: string; test: (v: number, n: number) => boolean }[] = [
  { simbolo: ">=", test: (v, n) => v >= n },
  { simbolo: "<=", test: (v, n) => v <= n },
  { simbolo: "!=", test: (v, n) => v !== n },
  { simbolo: ">", test: (v, n) => v > n },
  { simbolo: "<", test: (v, n) => v < n },
  { simbolo: "==", test: (v, n) => v === n },
];

function evaluarExpresion(valor: number, expresion: string): boolean {
  const exp = expresion.trim();
  for (const op of OPERADORES_EXPRESION) {
    if (exp.startsWith(op.simbolo)) {
      const numero = Number(exp.slice(op.simbolo.length).trim());
      return Number.isFinite(numero) && op.test(valor, numero);
    }
  }
  return false;
}

/**
 * `promedio`: solo tiene efecto con operador "sobre_promedio"/"bajo_promedio"
 * — el promedio de la MISMA serie de valores que se está coloreando (ej. el
 * promedio de todas las barras de una gráfica), no un umbral fijo que
 * alguien captura. Sin `promedio` (undefined), esas dos reglas nunca aplican
 * — no hay nada inventado contra qué comparar.
 */
export function cumpleRegla(valor: number, regla: ReglaColorColumna, promedio?: number, fila?: FilaValores): boolean {
  switch (regla.operador) {
    case "mayor_que_columna":
    case "menor_que_columna": {
      // Sin la otra columna en la fila (o sin dato) la regla no aplica: no hay contra qué comparar.
      const otro = regla.columnaComparada ? fila?.[regla.columnaComparada] : undefined;
      if (typeof otro !== "number" || !Number.isFinite(otro)) return false;
      return regla.operador === "mayor_que_columna" ? valor > otro : valor < otro;
    }
    case "mayor":
      return regla.valor !== undefined && valor > regla.valor;
    case "menor":
      return regla.valor !== undefined && valor < regla.valor;
    case "igual":
      return regla.valor !== undefined && valor === regla.valor;
    case "entre":
      return regla.valorMin !== undefined && regla.valorMax !== undefined && valor >= regla.valorMin && valor <= regla.valorMax;
    case "personalizada":
      return !!regla.expresion && evaluarExpresion(valor, regla.expresion);
    case "sobre_promedio":
      return promedio !== undefined && valor > promedio;
    case "bajo_promedio":
      return promedio !== undefined && valor < promedio;
  }
}

/** Primera regla que aplique a `valor` en esta columna (o a todas, si la regla no especifica columna) — null si ninguna aplica. */
export function colorParaValor(valor: number, columna: string, reglas: ReglaColorColumna[] | undefined, promedio?: number, fila?: FilaValores): string | null {
  if (!reglas) return null;
  for (const regla of reglas) {
    if (regla.columna && regla.columna !== columna) continue;
    // Una columna nunca se compara contra sí misma (regla sin columna fija + "contra columna").
    if (regla.columnaComparada && regla.columnaComparada === columna) continue;
    if (cumpleRegla(valor, regla, promedio, fila)) return regla.color;
  }
  return null;
}

const OPERADORES_REGLA_COLOR_VALIDOS: OperadorReglaColor[] = ["mayor", "menor", "igual", "entre", "personalizada", "sobre_promedio", "bajo_promedio", "mayor_que_columna", "menor_que_columna"];
const MAX_REGLAS_COLOR = 20;

/** Validación en el servidor de reglas que llegan del cliente (widgets, comparador): undefined = sin reglas, null = inválidas. */
export function validarReglasColor(reglas: unknown): ReglaColorColumna[] | undefined | null {
  if (reglas === undefined) return undefined;
  if (!Array.isArray(reglas) || reglas.length > MAX_REGLAS_COLOR) return null;
  const limpias: ReglaColorColumna[] = [];
  for (const r of reglas) {
    if (!r || typeof r !== "object") return null;
    const { id, columna, operador, valor, valorMin, valorMax, expresion, color, columnaComparada } = r as Record<string, unknown>;
    if (typeof id !== "string" || typeof columna !== "string" || typeof color !== "string") return null;
    if (!OPERADORES_REGLA_COLOR_VALIDOS.includes(operador as OperadorReglaColor)) return null;
    if (valor !== undefined && typeof valor !== "number") return null;
    if (valorMin !== undefined && typeof valorMin !== "number") return null;
    if (valorMax !== undefined && typeof valorMax !== "number") return null;
    if (expresion !== undefined && typeof expresion !== "string") return null;
    if (columnaComparada !== undefined && typeof columnaComparada !== "string") return null;
    limpias.push({
      id,
      columna: columna.slice(0, 200),
      operador: operador as OperadorReglaColor,
      valor,
      valorMin,
      valorMax,
      expresion: typeof expresion === "string" ? expresion.slice(0, 100) : undefined,
      columnaComparada: typeof columnaComparada === "string" && columnaComparada ? columnaComparada.slice(0, 200) : undefined,
      color: color.slice(0, 20),
    });
  }
  return limpias;
}

/** Promedio simple de una serie — helper compartido para pasarlo a `colorParaValor` cuando se colorea una lista completa (tabla, barras). */
export function promedioDe(valores: number[]): number | undefined {
  if (valores.length === 0) return undefined;
  return valores.reduce((acc, v) => acc + v, 0) / valores.length;
}
