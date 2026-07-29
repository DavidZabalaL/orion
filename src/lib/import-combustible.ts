export const CAMPOS_COMBUSTIBLE = [
  { key: "numeroEconomico", label: "N° económico", requerido: true },
  { key: "fecha", label: "Fecha", requerido: true },
  { key: "litros", label: "Litros", requerido: true },
  { key: "costo", label: "Costo", requerido: true },
  { key: "kmActual", label: "Km actual", requerido: true },
  { key: "estacion", label: "Estación", requerido: false },
] as const;

export type CampoCombustibleKey = (typeof CAMPOS_COMBUSTIBLE)[number]["key"];
