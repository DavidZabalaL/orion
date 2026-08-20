/**
 * Tipos y constantes puras del SLA de disponibilidad, sin ninguna
 * dependencia de servidor (Prisma/pg) — para poder importarse también desde
 * Client Components (ej. src/components/unidades/ficha-unidad.tsx) sin que
 * el bundler intente meter `pg` al bundle del navegador. La lógica de
 * cálculo/consulta vive en src/lib/sla-disponibilidad.ts, que reexporta esto.
 */

export type SlaUnidad = { diasActivo: number; diasInactivo: number; porcentaje: number | null };
export type SlaMensual = SlaUnidad & { anio: number; mes: number };
export type SlaMensualProyecto = { proyecto: string; anio: number; mes: number; porcentajePromedio: number; unidadesConDatos: number };

export const NOMBRE_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
