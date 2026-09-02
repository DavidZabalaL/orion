"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";

async function resolverOperador() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sin sesión.");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operadorId: true },
  });
  if (!usuario?.operadorId) throw new Error("Esta acción es solo para operadores.");

  return usuario.operadorId;
}

/** Abre una nueva sesión de uso para la unidad indicada.
 *  Si el operador ya tiene una sesión abierta con otra unidad, la cierra primero. */
export async function tomarUnidad(numeroEconomico: string) {
  const operadorId = await resolverOperador();

  const ahora = new Date();

  await prisma.$transaction(async (tx) => {
    // Cerrar cualquier sesión abierta de este operador
    await tx.bitacoraUsoUnidad.updateMany({
      where: { operadorId, fin: null },
      data: { fin: ahora },
    });

    // Abrir nueva sesión
    await tx.bitacoraUsoUnidad.create({
      data: { operadorId, numeroEconomico, inicio: ahora },
    });
  });

  revalidatePath("/operador/turno");
}

/** Cierra la sesión de uso activa del operador (libera la unidad). */
export async function liberarUnidad() {
  const operadorId = await resolverOperador();

  await prisma.bitacoraUsoUnidad.updateMany({
    where: { operadorId, fin: null },
    data: { fin: new Date() },
  });

  revalidatePath("/operador/turno");
}

export type SesionActiva = {
  id: string;
  numeroEconomico: string;
  marcaModelo: string;
  inicio: Date;
} | null;

export type RegistroHoy = {
  id: string;
  numeroEconomico: string;
  marcaModelo: string;
  inicio: Date;
  fin: Date | null;
};

export type UnidadDisponible = {
  numeroEconomico: string;
  marcaModelo: string;
  placas: string;
};

export type DatosTurno = {
  sesionActiva: SesionActiva;
  registrosHoy: RegistroHoy[];
  unidadesDisponibles: UnidadDisponible[];
};

export async function obtenerDatosTurno(): Promise<DatosTurno> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sin sesión.");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: {
      operadorId: true,
      operador: { select: { proyectoId: true } },
    },
  });

  if (!usuario?.operadorId) throw new Error("Solo para operadores.");

  const operadorId = usuario.operadorId;
  const proyectoId = usuario.operador?.proyectoId ?? null;

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [sesionAbierta, registrosHoy, unidades] = await Promise.all([
    prisma.bitacoraUsoUnidad.findFirst({
      where: { operadorId, fin: null },
      include: { unidad: { select: { marca: true, unidadModelo: true } } },
      orderBy: { inicio: "desc" },
    }),
    prisma.bitacoraUsoUnidad.findMany({
      where: { operadorId, inicio: { gte: inicioDia } },
      include: { unidad: { select: { marca: true, unidadModelo: true } } },
      orderBy: { inicio: "asc" },
    }),
    prisma.unidad.findMany({
      where: {
        proyectoId: proyectoId ?? undefined,
        estatus: "ACTIVO",
        disponibilidad: true,
      },
      select: {
        numeroEconomico: true,
        marca: true,
        unidadModelo: true,
        placas: true,
      },
      orderBy: { numeroEconomico: "asc" },
    }),
  ]);

  return {
    sesionActiva: sesionAbierta
      ? {
          id: sesionAbierta.id,
          numeroEconomico: sesionAbierta.numeroEconomico,
          marcaModelo: `${sesionAbierta.unidad.marca} ${sesionAbierta.unidad.unidadModelo}`,
          inicio: sesionAbierta.inicio,
        }
      : null,
    registrosHoy: registrosHoy.map((r) => ({
      id: r.id,
      numeroEconomico: r.numeroEconomico,
      marcaModelo: `${r.unidad.marca} ${r.unidad.unidadModelo}`,
      inicio: r.inicio,
      fin: r.fin,
    })),
    unidadesDisponibles: unidades.map((u) => ({
      numeroEconomico: u.numeroEconomico,
      marcaModelo: `${u.marca} ${u.unidadModelo}`,
      placas: u.placas,
    })),
  };
}

export type RegistroBitacoraAdmin = {
  id: string;
  operadorNombre: string;
  proyectoNombre: string;
  numeroEconomico: string;
  marcaModelo: string;
  inicio: Date;
  fin: Date | null;
};

export type FiltrosBitacoraAdmin = {
  proyectoId?: string;
  /** Proyectos a los que el usuario tiene acceso para el módulo "O" — null = sin restricción (rol global). */
  proyectosPermitidos: string[] | null;
  desde: Date;
  hasta: Date;
};

/** Consulta consolidada de toda la bitácora de uso de unidades, para quien tenga permiso de ver el módulo "O" pero no sea un Operador. */
export async function obtenerBitacoraUsoTodos(filtros: FiltrosBitacoraAdmin): Promise<RegistroBitacoraAdmin[]> {
  if (!(await tienePermisoModulo("O"))) throw new Error("No tienes permiso para consultar esta información.");

  // Intersección entre el proyecto elegido en el filtro y los proyectos a los
  // que el usuario tiene acceso — si elige uno fuera de su alcance, no ve nada
  // (en vez de ignorar la restricción de proyecto).
  const proyectosIds =
    filtros.proyectosPermitidos === null
      ? filtros.proyectoId
        ? [filtros.proyectoId]
        : null
      : filtros.proyectoId
        ? filtros.proyectosPermitidos.filter((id) => id === filtros.proyectoId)
        : filtros.proyectosPermitidos;

  const registros = await prisma.bitacoraUsoUnidad.findMany({
    where: {
      inicio: { gte: filtros.desde, lte: filtros.hasta },
      operador: proyectosIds ? { proyectoId: { in: proyectosIds } } : undefined,
    },
    include: {
      operador: { select: { nombre: true, proyecto: { select: { nombre: true } } } },
      unidad: { select: { marca: true, unidadModelo: true } },
    },
    orderBy: { inicio: "desc" },
    take: 500,
  });

  return registros.map((r) => ({
    id: r.id,
    operadorNombre: r.operador.nombre,
    proyectoNombre: r.operador.proyecto?.nombre ?? "Sin proyecto",
    numeroEconomico: r.numeroEconomico,
    marcaModelo: `${r.unidad.marca} ${r.unidad.unidadModelo}`,
    inicio: r.inicio,
    fin: r.fin,
  }));
}
