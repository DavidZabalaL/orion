import { parseFechaLocalMx, finDelDiaMx } from "@/lib/timezone";
import { TIPO_VEHICULO_LABEL } from "@/lib/estatus";
import type { TipoVehiculo } from "@/generated/prisma/enums";

export type FiltrosGasto = {
  desde: string;
  hasta: string;
  proyectoId: string;
  tipoVehiculo: string;
  q: string;
};

export type SearchParamsFiltros = { desde?: string; hasta?: string; proyecto?: string; tipo?: string; q?: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function leerFiltrosGasto(sp: SearchParamsFiltros): FiltrosGasto {
  return {
    desde: sp.desde && FECHA.test(sp.desde) ? sp.desde : "",
    hasta: sp.hasta && FECHA.test(sp.hasta) ? sp.hasta : "",
    proyectoId: sp.proyecto ?? "",
    tipoVehiculo: sp.tipo && sp.tipo in TIPO_VEHICULO_LABEL ? sp.tipo : "",
    q: (sp.q ?? "").trim().slice(0, 80),
  };
}

/**
 * Condiciones de Prisma para Combustible/Tag (ambos con `fecha`, `numeroEconomico`,
 * `unidad` y `proyectoReportanteId`). Van en un AND junto al filtro de alcance
 * por proyecto del usuario, así un `proyecto` de la URL nunca amplía lo permitido.
 */
export function condicionesFiltrosGasto(f: FiltrosGasto, camposTexto: string[]): Record<string, unknown>[] {
  const condiciones: Record<string, unknown>[] = [];
  const desde = parseFechaLocalMx(f.desde || null);
  const hasta = finDelDiaMx(f.hasta || null);
  if (desde || hasta) condiciones.push({ fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) } });
  if (f.proyectoId) condiciones.push({ OR: [{ unidad: { proyectoId: f.proyectoId } }, { proyectoReportanteId: f.proyectoId }] });
  if (f.tipoVehiculo) condiciones.push({ unidad: { tipoVehiculo: f.tipoVehiculo as TipoVehiculo } });
  if (f.q) {
    condiciones.push({ OR: ["numeroEconomico", ...camposTexto].map((campo) => ({ [campo]: { contains: f.q, mode: "insensitive" } })) });
  }
  return condiciones;
}
