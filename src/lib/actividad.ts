import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { inicioDeHoyMx, inicioDeMesMx, ZONA_HORARIA_MX } from "@/lib/timezone";

export const MODULO_ACTIVIDAD_LABEL: Record<string, string> = {
  vehiculos: "Vehículos",
  checklist: "Checklist",
  mantenimiento: "Mantenimiento",
  documentos: "Documentos",
  operadores: "Operadores",
  auth: "Sesión (login/logout)",
  combustible: "Combustible",
  seguros: "Seguros",
  tag: "TAG / Peajes",
  mapa: "Geolocalización",
  proyectos: "Proyectos",
  usuarios: "Administración",
  auditoria: "Auditoría",
  reportes: "Reportes",
  dashboards: "Dashboards",
};

const ACCION_VERBO: Record<string, string> = {
  create: "Registró",
  update: "Actualizó",
  delete: "Eliminó",
  import: "Importó",
  login: "Inició sesión",
  logout: "Cerró sesión",
  forzar_logout: "Forzó el cierre de sesión de",
};

const ENTIDAD_LABEL: Record<string, string> = {
  Unidad: "una unidad",
  Checklist: "un checklist",
  GastoVehicular: "un gasto de mantenimiento",
  Combustible: "una carga de combustible",
  MapeoTarjetaEconomico: "un mapeo de tarjeta de combustible",
  Seguro: "una póliza de seguro",
  Tag: "un peaje",
  PosicionGPS: "una posición GPS",
  Proyecto: "un proyecto",
  PresupuestoMensual: "el presupuesto mensual",
  PresupuestoPartida: "presupuesto por partida",
  Auditoria: "una discrepancia de auditoría",
  ReporteProgramado: "un reporte programado",
  VistaDashboardBI: "una vista de dashboard",
  Usuario: "un usuario",
  Rol: "permisos de un rol",
  ConfiguracionNotificaciones: "la configuración de notificaciones",
  ConfiguracionWidgets: "la configuración de widgets",
  Operador: "un operador",
};

/** Frase legible de un evento, ej. "Actualizó una unidad" o "Inició sesión". */
export function descripcionEvento(modulo: string, accion: string, entidad: string | null): string {
  if (modulo === "auth") return ACCION_VERBO[accion] ?? accion;
  const verbo = ACCION_VERBO[accion] ?? accion;
  const objeto = entidad ? (ENTIDAD_LABEL[entidad] ?? entidad) : (MODULO_ACTIVIDAD_LABEL[modulo] ?? modulo).toLowerCase();
  return `${verbo} ${objeto}`;
}

export type KpisAdopcion = {
  activosHoy: number;
  activosSemana: number;
  activosMes: number;
  totalCuentasActivas: number;
  porcentajeAdopcion: number;
};

function haceDias(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

export async function obtenerKpisAdopcion(): Promise<KpisAdopcion> {
  const [activosHoy, activosSemana, activosMes, totalCuentasActivas] = await Promise.all([
    prisma.activityLog.findMany({ where: { createdAt: { gte: inicioDeHoyMx() } }, distinct: ["userId"], select: { userId: true } }),
    prisma.activityLog.findMany({ where: { createdAt: { gte: haceDias(7) } }, distinct: ["userId"], select: { userId: true } }),
    prisma.activityLog.findMany({ where: { createdAt: { gte: inicioDeMesMx() } }, distinct: ["userId"], select: { userId: true } }),
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
  sesionInvalidadaEn: Date | null;
};

export async function obtenerTablaUltimaActividad(filtros: { rolId?: string; modulo?: string }): Promise<FilaUltimaActividad[]> {
  const usuarios = await prisma.usuario.findMany({
    where: { estatus: "ACTIVO", ...(filtros.rolId ? { rolId: filtros.rolId } : {}) },
    select: { id: true, nombre: true, correo: true, sesionInvalidadaEn: true, rol: { select: { nombre: true } } },
  });

  const ultimas = await prisma.activityLog.groupBy({
    by: ["userId"],
    where: filtros.modulo ? { modulo: filtros.modulo } : undefined,
    _max: { createdAt: true },
  });
  const ultimaPorUsuario = new Map(ultimas.map((u) => [u.userId, u._max.createdAt]));

  return usuarios
    .map((u) => ({
      usuarioId: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol.nombre,
      ultimaActividad: ultimaPorUsuario.get(u.id) ?? null,
      sesionInvalidadaEn: u.sesionInvalidadaEn,
    }))
    .sort((a, b) => (a.ultimaActividad?.getTime() ?? -Infinity) - (b.ultimaActividad?.getTime() ?? -Infinity));
}

export async function obtenerRolesConActividad(): Promise<{ id: string; nombre: string }[]> {
  return prisma.rol.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

export type EventoActividadUsuario = {
  id: string;
  modulo: string;
  accion: string;
  entidad: string | null;
  entidadId: string | null;
  detalle: unknown;
  descripcion: string;
  createdAt: Date;
};

export type PerfilActividadUsuario = {
  usuario: { id: string; nombre: string; correo: string; rol: string; estatus: string; sesionInvalidadaEn: Date | null };
  totalEventos: number;
  primeraActividad: Date | null;
  eventos: EventoActividadUsuario[];
};

/** Historial completo de un usuario — todo lo que ha hecho en la plataforma, más reciente primero. */
export async function obtenerActividadUsuario(usuarioId: string, opts?: { modulo?: string }): Promise<PerfilActividadUsuario | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nombre: true, correo: true, estatus: true, sesionInvalidadaEn: true, rol: { select: { nombre: true } } },
  });
  if (!usuario) return null;

  const [eventos, totalEventos, primerEvento] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId: usuarioId, ...(opts?.modulo ? { modulo: opts.modulo } : {}) },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.activityLog.count({ where: { userId: usuarioId } }),
    prisma.activityLog.findFirst({ where: { userId: usuarioId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);

  return {
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol.nombre, estatus: usuario.estatus, sesionInvalidadaEn: usuario.sesionInvalidadaEn },
    totalEventos,
    primeraActividad: primerEvento?.createdAt ?? null,
    eventos: eventos.map((e) => ({
      id: e.id,
      modulo: e.modulo,
      accion: e.accion,
      entidad: e.entidad,
      entidadId: e.entidadId,
      detalle: e.detalle,
      descripcion: descripcionEvento(e.modulo, e.accion, e.entidad),
      createdAt: e.createdAt,
    })),
  };
}

export type PuntoActividadDiaria = { dimension: string; valor: number };

export async function obtenerSerieActividadDiaria(dias: number): Promise<PuntoActividadDiaria[]> {
  const desde = haceDias(dias);
  const filas = await prisma.$queryRaw<{ dia: string; total: bigint }[]>(
    Prisma.sql`
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${ZONA_HORARIA_MX}, 'YYYY-MM-DD') AS dia, COUNT(*) AS total
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
