// Reglas de color condicional configurables para las tablas del Explorador
// BI (TablaSimple / BiTablaCruzada) — semáforo por valor, aplicado en el
// cliente al visualizar (no cambia la consulta ni se manda al servidor).
// "Personalizada" es una comparación simple (ej. ">=100") parseada con un
// whitelist de operadores fijo — nunca se evalúa como código (sin eval()).

export type OperadorReglaColor = "mayor" | "menor" | "igual" | "entre" | "personalizada";

export type ReglaColorColumna = {
  id: string;
  /** Nombre de la columna/serie a la que aplica — "" (vacío) = todas las columnas numéricas de la tabla. */
  columna: string;
  operador: OperadorReglaColor;
  valor?: number;
  valorMin?: number;
  valorMax?: number;
  expresion?: string;
  color: string;
};

export const OPERADOR_REGLA_COLOR_LABEL: Record<OperadorReglaColor, string> = {
  mayor: "Mayor que",
  menor: "Menor que",
  igual: "Igual a",
  entre: "Entre",
  personalizada: "Personalizada",
};

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

export function cumpleRegla(valor: number, regla: ReglaColorColumna): boolean {
  switch (regla.operador) {
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
  }
}

/** Primera regla que aplique a `valor` en esta columna (o a todas, si la regla no especifica columna) — null si ninguna aplica. */
export function colorParaValor(valor: number, columna: string, reglas: ReglaColorColumna[] | undefined): string | null {
  if (!reglas) return null;
  for (const regla of reglas) {
    if (regla.columna && regla.columna !== columna) continue;
    if (cumpleRegla(valor, regla)) return regla.color;
  }
  return null;
}
