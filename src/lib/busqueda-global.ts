"use server";

import { prisma } from "@/lib/prisma";

export type ResultadoBusquedaGlobal = {
  unidades: { numeroEconomico: string; placas: string; marca: string; unidadModelo: string }[];
  operadores: { id: string; nombre: string; curp: string }[];
};

export async function buscarGlobal(query: string): Promise<ResultadoBusquedaGlobal> {
  const q = query.trim();
  if (q.length < 2) return { unidades: [], operadores: [] };

  const [unidades, operadores] = await Promise.all([
    prisma.unidad.findMany({
      where: {
        OR: [
          { numeroEconomico: { contains: q, mode: "insensitive" } },
          { placas: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { numeroEconomico: true, placas: true, marca: true, unidadModelo: true },
      orderBy: { numeroEconomico: "asc" },
      take: 6,
    }),
    prisma.operador.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { curp: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, curp: true },
      orderBy: { nombre: "asc" },
      take: 6,
    }),
  ]);

  return { unidades, operadores };
}
