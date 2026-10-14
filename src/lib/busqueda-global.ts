"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { tienePermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo, unidadRestringidaParaOperador } from "@/lib/proyectos-usuario";

export type ResultadoBusquedaGlobal = {
  unidades: { numeroEconomico: string; placas: string; marca: string; unidadModelo: string }[];
  operadores: { id: string; nombre: string; proyecto: string | null }[];
};

const VACIO: ResultadoBusquedaGlobal = { unidades: [], operadores: [] };

// Es una Server Action (invocable directo por POST, sin pasar por la UI), así
// que valida sesión, permiso de módulo y alcance por proyecto igual que las
// páginas /unidades (módulo A) y /operadores (módulo L). La CURP se puede usar
// como término de búsqueda pero nunca se devuelve.
export async function buscarGlobal(query: string): Promise<ResultadoBusquedaGlobal> {
  const session = await auth();
  if (!session?.user?.id) return VACIO;

  const q = String(query ?? "").trim().slice(0, 100);
  if (q.length < 2) return VACIO;

  const [puedeUnidades, puedeOperadores] = await Promise.all([tienePermisoModulo("A"), tienePermisoModulo("L")]);

  const buscarUnidades = async () => {
    if (!puedeUnidades) return [];
    const [permitidos, restriccionOperador] = await Promise.all([proyectosPermitidosParaModulo("A"), unidadRestringidaParaOperador()]);
    return prisma.unidad.findMany({
      where: {
        ...(permitidos !== null ? { proyectoId: { in: permitidos } } : {}),
        ...(restriccionOperador.esOperador ? { numeroEconomico: { in: restriccionOperador.numerosEconomicos } } : {}),
        OR: [
          { numeroEconomico: { contains: q, mode: "insensitive" } },
          { placas: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { numeroEconomico: true, placas: true, marca: true, unidadModelo: true },
      orderBy: { numeroEconomico: "asc" },
      take: 6,
    });
  };

  const buscarOperadores = async () => {
    if (!puedeOperadores) return [];
    const permitidos = await proyectosPermitidosParaModulo("L");
    const operadores = await prisma.operador.findMany({
      where: {
        ...(permitidos !== null ? { proyectoId: { in: permitidos } } : {}),
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { curp: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, nombre: true, proyecto: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
      take: 6,
    });
    return operadores.map((o) => ({ id: o.id, nombre: o.nombre, proyecto: o.proyecto?.nombre ?? null }));
  };

  const [unidades, operadores] = await Promise.all([buscarUnidades(), buscarOperadores()]);
  return { unidades, operadores };
}
