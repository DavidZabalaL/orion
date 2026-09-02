"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo, puedeLiberarUnidadAjena } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

/**
 * Quién es "yo" para efectos de tomar/liberar una unidad: un Operador real
 * en su turno normal, o —si el rol tiene "editar" en el módulo O pero la
 * cuenta no está vinculada a ningún Operador (ej. Control Vehicular, Gerente
 * administrativo)— la propia cuenta de Usuario, de forma excepcional.
 */
type Identidad = { operadorId: string } | { usuarioId: string };

async function resolverIdentidad(): Promise<Identidad> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sin sesión.");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operadorId: true },
  });
  if (usuario?.operadorId) return { operadorId: usuario.operadorId };

  if (!(await tienePermisoModulo("O", "editar"))) throw new Error("No tienes permiso para tomar o liberar unidades.");
  return { usuarioId: session.user.id };
}

/** Abre una nueva sesión de uso para la unidad indicada.
 *  Si ya se tiene una sesión abierta con otra unidad, la cierra primero. */
export async function tomarUnidad(numeroEconomico: string) {
  const identidad = await resolverIdentidad();

  const ahora = new Date();

  await prisma.$transaction(async (tx) => {
    // Cerrar cualquier sesión abierta propia
    await tx.bitacoraUsoUnidad.updateMany({
      where: { ...identidad, fin: null },
      data: { fin: ahora },
    });

    // Abrir nueva sesión
    await tx.bitacoraUsoUnidad.create({
      data: { ...identidad, numeroEconomico, inicio: ahora },
    });
  });

  revalidatePath("/operador/turno");
}

/** Cierra la sesión de uso activa propia (libera la unidad). */
export async function liberarUnidad() {
  const identidad = await resolverIdentidad();

  await prisma.bitacoraUsoUnidad.updateMany({
    where: { ...identidad, fin: null },
    data: { fin: new Date() },
  });

  revalidatePath("/operador/turno");
}

/** Fuerza el cierre de una sesión que tomó OTRA persona — ver puedeLiberarUnidadAjena. */
export async function liberarUnidadAjena(id: string) {
  if (!(await puedeLiberarUnidadAjena())) throw new Error("No tienes permiso para liberar unidades de otras personas.");

  await prisma.bitacoraUsoUnidad.updateMany({
    where: { id, fin: null },
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

/** Datos del panel de "tomar/liberar unidad" propio — para un Operador real o, de forma excepcional, para un Usuario con "editar" en el módulo O. */
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
  if (!usuario) throw new Error("Usuario no encontrado.");

  const identidad: Identidad = usuario.operadorId
    ? { operadorId: usuario.operadorId }
    : { usuarioId: session.user.id };

  let proyectosIds: string[] | null;
  if ("operadorId" in identidad) {
    // El operador solo puede tomar unidades de su propio proyecto asignado
    // — sin proyecto asignado, no ve ninguna (nunca "todas por defecto").
    proyectosIds = usuario.operador?.proyectoId ? [usuario.operador.proyectoId] : [];
  } else {
    if (!(await tienePermisoModulo("O", "editar"))) throw new Error("No tienes permiso para tomar unidades.");
    proyectosIds = await proyectosPermitidosParaModulo("O");
  }

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const [sesionAbierta, registrosHoy, unidades] = await Promise.all([
    prisma.bitacoraUsoUnidad.findFirst({
      where: { ...identidad, fin: null },
      include: { unidad: { select: { marca: true, unidadModelo: true } } },
      orderBy: { inicio: "desc" },
    }),
    prisma.bitacoraUsoUnidad.findMany({
      where: { ...identidad, inicio: { gte: inicioDia } },
      include: { unidad: { select: { marca: true, unidadModelo: true } } },
      orderBy: { inicio: "asc" },
    }),
    prisma.unidad.findMany({
      where: {
        ...(proyectosIds !== null ? { proyectoId: { in: proyectosIds } } : {}),
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
  tomadoPor: string;
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

/** Consulta consolidada de toda la bitácora de uso de unidades, para quien tenga permiso de ver el módulo "O". */
export async function obtenerBitacoraUsoTodos(filtros: FiltrosBitacoraAdmin): Promise<RegistroBitacoraAdmin[]> {
  if (!(await tienePermisoModulo("O"))) throw new Error("No tienes permiso para consultar esta información.");

  // Intersección entre el proyecto elegido en el filtro y los proyectos a los
  // que el usuario tiene acceso — si elige uno fuera de su alcance, no ve nada
  // (en vez de ignorar la restricción de proyecto). El proyecto de cada fila
  // se filtra por el de la UNIDAD, no el de la persona (una fila puede venir
  // de un Usuario sin proyecto propio asignado individualmente).
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
      unidad: proyectosIds ? { proyectoId: { in: proyectosIds } } : undefined,
    },
    include: {
      operador: { select: { nombre: true } },
      usuario: { select: { nombre: true } },
      unidad: { select: { marca: true, unidadModelo: true, proyecto: { select: { nombre: true } } } },
    },
    orderBy: { inicio: "desc" },
    take: 500,
  });

  return registros.map((r) => ({
    id: r.id,
    tomadoPor: r.operador?.nombre ?? r.usuario?.nombre ?? "—",
    proyectoNombre: r.unidad.proyecto?.nombre ?? "Sin proyecto",
    numeroEconomico: r.numeroEconomico,
    marcaModelo: `${r.unidad.marca} ${r.unidad.unidadModelo}`,
    inicio: r.inicio,
    fin: r.fin,
  }));
}
