import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const MODULO_ACTIVIDAD_LABEL: Record<string, string> = {
  vehiculos: "Vehículos",
  checklist: "Checklist",
  mantenimiento: "Mantenimiento",
  documentos: "Documentos",
  operadores: "Operadores",
  auth: "Sesión (login/logout)",
};

export type KpisAdopcion = {
  activosHoy: number;
  activosSemana: number;
  activosMes: number;
  totalCuentasActivas: number;
  porcentajeAdopcion: number;
};

function inicioDeHoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioDeMes(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function haceDias(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export async function obtenerKpisAdopcion(): Promise<KpisAdopcion> {
  const [activosHoy, activosSemana, activosMes, totalCuentasActivas] = await Promise.all([
    prisma.activityLog.findMany({ where: { createdAt: { gte: inicioDeHoy() } }, distinct: ["userId"], select: { userId: true } }),
    prisma.activityLog.findMany({ where: { createdAt: { gte: haceDias(7) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.activityLog.findMany({ where: { createdAt: { gte: inicioDeMes() } }, distinct: ["userId"], select: { userId: true } }),
    prisma.usuario.count({ where: { estatus: "ACTIVO" } }),
  ]);

  const porcentajeAdopcion = totalCuentasActivas > 0 ? (activosMes.length / totalCuentasActivas) * 100 : 0;

  return {
    activosHoy: activosHoy.length,
    activosSemana: activosSemana.length,
    activosMes: activosMes.length,
    totalCuentasActivas,
    porcentajeAdopcion,
  };
}

export type FilaUltimaActividad = {
  usuarioId: string;
  nombre: string;
  correo: string;
  rol: string;
  ultimaActividad: Date | null;
};

export async function obtenerTablaUltimaActividad(filtros: { rolId?: string; modulo?: string }): Promise<FilaUltimaActividad[]> {
  const usuarios = await prisma.usuario.findMany({
    where: { estatus: "ACTIVO", ...(filtros.rolId ? { rolId: filtros.rolId } : {}) },
    select: { id: true, nombre: true, correo: true, rol: { select: { nombre: true } } },
  });

  const ultimas = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: filtros.modulo ? { modulo: filtros.modulo } : undefined,
    _max: { createdAt: true },
  });
  const ultimaPorUsuario = new Map(ultimas.map((u) => [u.userId, u._max.createdAt]));

  return usuarios
    .map((u) => ({ usuarioId: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol.nombre, ultimaActividad: ultimaPorUsuario.get(u.id) ?? null }))
    .sort((a, b) => (a.ultimaActividad?.getTime() ?? -Infinity) - (b.ultimaActividad?.getTime() ?? -Infinity));
}

export async function obtenerRolesConActividad(): Promise<{ id: string; nombre: string }[]> {
  return prisma.rol.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

export type PuntoActividadDiaria = { dimension: string; valor: number };

export async function obtenerSerieActividadDiaria(dias: number): Promise<PuntoActividadDiaria[]> {
  const desde = haceDias(dias);
  const filas = await prisma.$queryRaw<{ dia: string; total: bigint }[]>(
    Prisma.sql`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS dia, COUNT(*) AS total
      FROM "ActivityLog"
      WHERE "createdAt" >= ${desde}
      GROUP BY dia
      ORDER BY dia ASC
    `
  );
  return filas.map((f) => ({ dimension: f.dia, valor: Number(f.total) }));
}

export type EventoTrazabilidad = {
  id: string;
  usuario: string;
  modulo: string;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: unknown;
  createdAt: Date;
};

export async function buscarTrazabilidad(query: string): Promise<EventoTrazabilidad[]> {
  const q = query.trim();
  if (!q) return [];

  const filas = await prisma.activityLog.findMany({
    where: { OR: [{ entidadId: { contains: q, mode: "insensitive" } }, { entidad: { contains: q, mode: "insensitive" } }] },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return filas.map((f) => ({
    id: f.id,
    usuario: f.usuario.nombre,
    modulo: f.modulo,
    accion: f.accion,
    entidad: f.entidad,
    entidadId: f.entidadId,
    detalle: f.detalle,
    createdAt: f.createdAt,
  }));
}
