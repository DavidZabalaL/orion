// Gasto total por unidad y su desglose por partida — para la ficha de la
// unidad y el comparativo entre unidades. Mismas fuentes reales que el BI
// ("Gasto total (todas las fuentes)" en src/lib/bi/metadata.ts): combustible
// sale de Combustible, casetas de Tag y el resto de GastoVehicular (sin sus
// categorías GASOLINA/CASETAS, que se cuentan desde su módulo propio). Además
// suma siniestros (arrastre + reparación, no la estimación) y pólizas de seguro.
//
// Una consulta agrupada por fuente para todas las unidades pedidas a la vez —
// nunca una por unidad (ver incidente de cuota de Neon por N+1).
import { prisma } from "@/lib/prisma";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import type { CategoriaGasto } from "@/generated/prisma/enums";

export type GrupoPartida = "combustible" | "casetas" | "mantenimiento" | "tramites" | "siniestros" | "seguros" | "otros";

export const GRUPO_PARTIDA_LABEL: Record<GrupoPartida, string> = {
  combustible: "Combustible",
  casetas: "Casetas (TAG)",
  mantenimiento: "Mantenimiento",
  tramites: "Trámites",
  siniestros: "Siniestros",
  seguros: "Seguros",
  otros: "Otros",
};

const GRUPO_POR_CATEGORIA: Partial<Record<CategoriaGasto, GrupoPartida>> = {
  MANTENIMIENTO_PREVENTIVO: "mantenimiento",
  MANTENIMIENTO_CORRECTIVO: "mantenimiento",
  LLANTAS: "mantenimiento",
  REFACCIONES: "mantenimiento",
  CONSUMIBLES: "mantenimiento",
  TENENCIA: "tramites",
  VERIFICACION: "tramites",
  EMPLACAMIENTO: "tramites",
};

export type PartidaGasto = { clave: string; label: string; grupo: GrupoPartida; monto: number };

export type GastoUnidad = {
  total: number;
  /** Ordenadas de mayor a menor monto; solo partidas con monto > 0. */
  partidas: PartidaGasto[];
  porGrupo: Record<GrupoPartida, number>;
  /** Para el comparativo: litros cargados y km/litros de las cargas con rendimiento válido (rendimiento real = km ÷ litros). */
  litros: number;
  kmRendimiento: number;
  litrosRendimiento: number;
};

const vacio = (): GastoUnidad => ({
  total: 0,
  partidas: [],
  porGrupo: { combustible: 0, casetas: 0, mantenimiento: 0, tramites: 0, siniestros: 0, seguros: 0, otros: 0 },
  litros: 0,
  kmRendimiento: 0,
  litrosRendimiento: 0,
});

/** Gasto de cada unidad pedida desde `desde` (null = todo el histórico). */
export async function gastoPorUnidad(numeros: string[], desde: Date | null): Promise<Map<string, GastoUnidad>> {
  const resultado = new Map(numeros.map((n) => [n, vacio()]));
  if (numeros.length === 0) return resultado;
  const enUnidades = { numeroEconomico: { in: numeros } };
  const fecha = desde ? { gte: desde } : undefined;

  const [combustible, rendimiento, casetas, gastos, siniestros, seguros] = await Promise.all([
    prisma.combustible.groupBy({ by: ["numeroEconomico"], where: { ...enUnidades, fecha }, _sum: { costo: true, litros: true } }),
    prisma.combustible.groupBy({
      by: ["numeroEconomico"],
      where: { ...enUnidades, fecha, rendimientoCalculado: { not: null }, kmRecorridos: { not: null } },
      _sum: { kmRecorridos: true, litros: true },
    }),
    prisma.tag.groupBy({ by: ["numeroEconomico"], where: { ...enUnidades, fecha }, _sum: { monto: true } }),
    prisma.gastoVehicular.groupBy({
      by: ["numeroEconomico", "categoria"],
      where: { ...enUnidades, fecha, categoria: { notIn: ["GASOLINA", "CASETAS"] }, estatus: { not: "CANCELADO" } },
      _sum: { costo: true },
    }),
    prisma.siniestro.groupBy({ by: ["numeroEconomico"], where: { ...enUnidades, fecha }, _sum: { costoArrastre: true, costoReparacion: true } }),
    prisma.seguro.groupBy({ by: ["numeroEconomico"], where: { ...enUnidades, fechaInicio: fecha }, _sum: { costo: true } }),
  ]);

  const sumar = (n: string | null, partida: PartidaGasto) => {
    const g = n ? resultado.get(n) : undefined;
    if (!g || !(partida.monto > 0)) return;
    const existente = g.partidas.find((p) => p.clave === partida.clave);
    if (existente) existente.monto += partida.monto;
    else g.partidas.push({ ...partida });
    g.porGrupo[partida.grupo] += partida.monto;
    g.total += partida.monto;
  };

  for (const c of combustible) {
    sumar(c.numeroEconomico, { clave: "combustible", label: "Combustible", grupo: "combustible", monto: Number(c._sum.costo ?? 0) });
    const g = c.numeroEconomico ? resultado.get(c.numeroEconomico) : undefined;
    if (g) g.litros = Number(c._sum.litros ?? 0);
  }
  for (const r of rendimiento) {
    const g = r.numeroEconomico ? resultado.get(r.numeroEconomico) : undefined;
    if (g) {
      g.kmRendimiento = r._sum.kmRecorridos ?? 0;
      g.litrosRendimiento = Number(r._sum.litros ?? 0);
    }
  }
  for (const t of casetas) sumar(t.numeroEconomico, { clave: "casetas", label: "Casetas (TAG)", grupo: "casetas", monto: Number(t._sum.monto ?? 0) });
  for (const gv of gastos) {
    sumar(gv.numeroEconomico, {
      clave: gv.categoria,
      label: CATEGORIA_GASTO_LABEL[gv.categoria] ?? gv.categoria,
      grupo: GRUPO_POR_CATEGORIA[gv.categoria] ?? "otros",
      monto: Number(gv._sum.costo ?? 0),
    });
  }
  for (const s of siniestros) {
    sumar(s.numeroEconomico, { clave: "siniestros", label: "Siniestros (arrastre y reparación)", grupo: "siniestros", monto: Number(s._sum.costoArrastre ?? 0) + Number(s._sum.costoReparacion ?? 0) });
  }
  for (const s of seguros) sumar(s.numeroEconomico, { clave: "seguros", label: "Pólizas de seguro", grupo: "seguros", monto: Number(s._sum.costo ?? 0) });

  for (const g of resultado.values()) g.partidas.sort((a, b) => b.monto - a.monto);
  return resultado;
}

/** Rendimiento real (km ÷ litros de las cargas válidas), o null sin datos. */
export function rendimientoReal(g: GastoUnidad): number | null {
  return g.litrosRendimiento > 0 && g.kmRendimiento > 0 ? Math.round((g.kmRendimiento / g.litrosRendimiento) * 100) / 100 : null;
}
