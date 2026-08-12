// Nombres canónicos de los 32 estados tal como aparecen en la propiedad
// "estado" de mexico-estados.json (el GeoJSON del mapa coroplético).
export const ESTADOS_MEXICO = [
  "Distrito Federal",
  "Guerrero",
  "México",
  "Morelos",
  "Sinaloa",
  "Baja California",
  "Sonora",
  "Baja California Sur",
  "Zacatecas",
  "Durango",
  "Chihuahua",
  "Colima",
  "Nayarit",
  "Michoacán de Ocampo",
  "Jalisco",
  "Chiapas",
  "Tabasco",
  "Oaxaca",
  "Guanajuato",
  "Aguascalientes",
  "Querétaro",
  "San Luis Potosí",
  "Tlaxcala",
  "Puebla",
  "Hidalgo",
  "Veracruz de Ignacio de la Llave",
  "Nuevo León",
  "Coahuila de Zaragoza",
  "Tamaulipas",
  "Yucatán",
  "Campeche",
  "Quintana Roo",
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Variantes comunes con las que este proyecto captura el estado (mayúsculas/minúsculas, abreviaturas, sin acentos) → nombre canónico del GeoJSON. */
const ALIAS: Record<string, string> = {
  cdmx: "Distrito Federal",
  "ciudad de mexico": "Distrito Federal",
  df: "Distrito Federal",
  "distrito federal": "Distrito Federal",
  edomex: "México",
  "edo mex": "México",
  "estado de mexico": "México",
  mexico: "México",
  michoacan: "Michoacán de Ocampo",
  coahuila: "Coahuila de Zaragoza",
  veracruz: "Veracruz de Ignacio de la Llave",
  queretaro: "Querétaro",
  "nuevo leon": "Nuevo León",
  "san luis potosi": "San Luis Potosí",
  yucatan: "Yucatán",
};

const CANONICO_POR_NORMALIZADO = new Map(ESTADOS_MEXICO.map((e) => [normalizar(e), e]));

/** Resuelve un texto libre (como se captura hoy en la plataforma) a uno de los 32 nombres canónicos del mapa, o null si no se reconoce. */
export function resolverEstado(texto: string): string | null {
  const norm = normalizar(texto);
  return CANONICO_POR_NORMALIZADO.get(norm) ?? ALIAS[norm] ?? null;
}
