// Bitácora de movimientos: reemplazo del panel de "Auditoría diaria y
// calidad" (conciliación PTTO/REAL/CV sin fuente de datos real) por un
// buscador de todo lo que le ha pasado a una unidad, un proyecto o un
// operador — construido sobre ActivityLog, que ya registra prácticamente
// toda escritura de la plataforma (ver src/lib/activity.ts / logActivity).
//
// A diferencia de `buscarTrazabilidad` (src/lib/actividad.ts, exclusivo de
// dev-admin y sin restricción de proyecto), esta búsqueda es para el
// permiso "I" normal: el alcance de proyecto se aplica AL BUSCAR la
// entidad raíz (Unidad/Proyecto/Operador) — todos los ids "candidatos" que
// se arman después salen de registros que ya pertenecen a esa entidad, así
// que nunca hace falta revalidar el alcance evento por evento.
import { prisma } from "@/lib/prisma";
import type { EventoTrazabilidad } from "@/lib/actividad";

export type TipoEntidadMovimiento = "unidad" | "proyecto" | "operador";

export type CoincidenciaMovimiento = { id: string; label: string };

export type ResultadoBusquedaMovimientos = {
  eventos: EventoTrazabilidad[];
  coincidencias: CoincidenciaMovimiento[];
};

const MAX_COINCIDENCIAS = 20;
const MAX_EVENTOS = 300;

async function consultarEventos(candidatos: string[]): Promise<EventoTrazabilidad[]> {
  if (candidatos.length === 0) return [];
  const filas = await prisma.activityLog.findMany({
    where: { entidadId: { in: candidatos } },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { createdAt: "desc" },
    take: MAX_EVENTOS,
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

async function buscarMovimientosUnidad(q: string, proyectosPermitidos: string[] | null): Promise<ResultadoBusquedaMovimientos> {
  const unidades = await prisma.unidad.findMany({
    where: {
      numeroEconomico: { contains: q, mode: "insensitive" },
      ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
    },
    select: { numeroEconomico: true, marca: true, unidadModelo: true },
    take: MAX_COINCIDENCIAS,
  });
  if (unidades.length === 0) return { eventos: [], coincidencias: [] };

  const numeroEconomicos = unidades.map((u) => u.numeroEconomico);
  const [gastos, combustibles, tags, seguros, checklists, accidentes] = await Promise.all([
    prisma.gastoVehicular.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
    prisma.combustible.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
    prisma.tag.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
    prisma.seguro.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
    prisma.checklist.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
    prisma.accidente.findMany({ where: { numeroEconomico: { in: numeroEconomicos } }, select: { id: true } }),
  ]);

  // "Unidad" y "PosicionGPS" usan el propio numeroEconomico como entidadId (ver src/app/(app)/unidades/actions.ts, mapa/actions.ts).
  const candidatos = [
    ...numeroEconomicos,
    ...gastos.map((g) => g.id),
    ...combustibles.map((c) => c.id),
    ...tags.map((t) => t.id),
    ...seguros.map((s) => s.id),
    ...checklists.map((c) => c.id),
    ...accidentes.map((a) => a.id),
  ];

  const eventos = await consultarEventos(candidatos);
  return {
    eventos,
    coincidencias: unidades.map((u) => ({ id: u.numeroEconomico, label: `${u.numeroEconomico} — ${u.marca} ${u.unidadModelo}` })),
  };
}

async function buscarMovimientosProyecto(q: string, proyectosPermitidos: string[] | null): Promise<ResultadoBusquedaMovimientos> {
  const proyectos = await prisma.proyecto.findMany({
    where: {
      nombre: { contains: q, mode: "insensitive" },
      ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}),
    },
    select: { id: true, nombre: true },
    take: MAX_COINCIDENCIAS,
  });
  if (proyectos.length === 0) return { eventos: [], coincidencias: [] };

  const proyectoIds = proyectos.map((p) => p.id);
  const partidas = await prisma.presupuestoPartida.findMany({ where: { proyectoId: { in: proyectoIds } }, select: { id: true } });

  // "Proyecto" y "PresupuestoMensual" usan el propio proyectoId como entidadId (ver src/app/(app)/proyectos/actions.ts).
  const candidatos = [...proyectoIds, ...partidas.map((p) => p.id)];

  const eventos = await consultarEventos(candidatos);
  return { eventos, coincidencias: proyectos.map((p) => ({ id: p.id, label: p.nombre })) };
}

async function buscarMovimientosOperador(q: string, proyectosPermitidos: string[] | null): Promise<ResultadoBusquedaMovimientos> {
  const operadores = await prisma.operador.findMany({
    where: {
      nombre: { contains: q, mode: "insensitive" },
      ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
    },
    select: { id: true, nombre: true },
    take: MAX_COINCIDENCIAS,
  });
  if (operadores.length === 0) return { eventos: [], coincidencias: [] };

  const operadorIds = operadores.map((o) => o.id);
  const [documentos, accidentes] = await Promise.all([
    prisma.documentoOperador.findMany({ where: { operadorId: { in: operadorIds } }, select: { id: true } }),
    prisma.accidente.findMany({ where: { operadorId: { in: operadorIds } }, select: { id: true } }),
  ]);

  const candidatos = [...operadorIds, ...documentos.map((d) => d.id), ...accidentes.map((a) => a.id)];

  const eventos = await consultarEventos(candidatos);
  return { eventos, coincidencias: operadores.map((o) => ({ id: o.id, label: o.nombre })) };
}

export async function buscarMovimientos(tipo: TipoEntidadMovimiento, query: string, proyectosPermitidos: string[] | null): Promise<ResultadoBusquedaMovimientos> {
  const q = query.trim();
  if (!q) return { eventos: [], coincidencias: [] };
  if (tipo === "proyecto") return buscarMovimientosProyecto(q, proyectosPermitidos);
  if (tipo === "operador") return buscarMovimientosOperador(q, proyectosPermitidos);
  return buscarMovimientosUnidad(q, proyectosPermitidos);
}
