import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { esRolGlobal } from "@/lib/permisos";
import { esCorreoDevAdmin } from "@/lib/dev-admin";

export type ProyectosAsignados = { todos: true } | { todos: false; ids: string[] };

/**
 * Proyectos a los que el usuario actual tiene acceso. Administrador (permiso "*")
 * ve todos sin restricción; el resto solo los que tiene asignados en UsuarioProyecto
 * (un usuario sin ningún proyecto asignado no ve datos de ningún proyecto).
 */
export async function obtenerProyectosAsignados(): Promise<ProyectosAsignados> {
  if (await esRolGlobal()) return { todos: true };

  const session = await auth();
  if (!session?.user?.id) return { todos: false, ids: [] };

  const asignaciones = await prisma.usuarioProyecto.findMany({
    where: { usuarioId: session.user.id },
    select: { proyectoId: true },
  });
  return { todos: false, ids: asignaciones.map((a) => a.proyectoId) };
}

/**
 * Combina la asignación de proyecto del usuario con el toggle de módulo de cada
 * proyecto (Proyecto.modulosActivos). Regresa null = sin filtro (Administrador);
 * si no, la lista de proyectoId permitidos para ESE módulo específico (puede ser
 * un arreglo vacío — Prisma con `in: []` ya regresa 0 filas, no hace falta un
 * caso especial para "ninguno").
 */
export async function proyectosPermitidosParaModulo(moduloId: string): Promise<string[] | null> {
  const asignados = await obtenerProyectosAsignados();
  if (asignados.todos) return null;
  if (asignados.ids.length === 0) return [];

  const proyectos = await prisma.proyecto.findMany({
    where: { id: { in: asignados.ids } },
    select: { id: true, modulosActivos: true },
  });
  return proyectos.filter((p) => (p.modulosActivos as string[]).includes(moduloId)).map((p) => p.id);
}

/**
 * El rol "Operador" solo puede ver, dentro del módulo A (Unidades), las unidades
 * que tiene resguardadas (puede ser responsable de varias a la vez) — no el
 * resto de la flota. Para cualquier otro rol no aplica ninguna restricción
 * adicional (el alcance por proyecto ya cubre esos casos).
 */
export async function unidadRestringidaParaOperador(): Promise<{ esOperador: true; numerosEconomicos: string[] } | { esOperador: false }> {
  const session = await auth();
  if (!session?.user?.id || session.user.rol !== "Operador") return { esOperador: false };

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operador: { select: { unidadesResguardadas: { select: { numeroEconomico: true } } } } },
  });
  return { esOperador: true, numerosEconomicos: usuario?.operador?.unidadesResguardadas.map((u) => u.numeroEconomico) ?? [] };
}

/**
 * Igual que `proyectosPermitidosParaModulo`, pero para un `usuarioId` explícito
 * en vez de la sesión activa — necesario para el motor de reportes
 * programados (cron de Vercel), que corre sin sesión HTTP: el alcance de cada
 * reporte se resuelve con los permisos de su dueño (`ReporteProgramado.creadoPorId`),
 * nunca con un usuario "sistema" sin restricción. Reimplementa la cadena
 * esDevAdmin → rol "*" → UsuarioProyecto directamente (sin pasar por `auth()`)
 * para no tocar el camino basado en sesión que usa el resto de la app.
 */
export async function proyectosPermitidosParaModuloDeUsuario(usuarioId: string, moduloId: string): Promise<string[] | null> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { correo: true, rol: { select: { permisos: true } } },
  });
  if (!usuario) return [];
  if (esCorreoDevAdmin(usuario.correo)) return null;

  const permisos = usuario.rol.permisos as Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> | null;
  if (permisos && "*" in permisos) return null;

  const asignaciones = await prisma.usuarioProyecto.findMany({ where: { usuarioId }, select: { proyectoId: true } });
  if (asignaciones.length === 0) return [];

  const proyectos = await prisma.proyecto.findMany({
    where: { id: { in: asignaciones.map((a) => a.proyectoId) } },
    select: { id: true, modulosActivos: true },
  });
  return proyectos.filter((p) => (p.modulosActivos as string[]).includes(moduloId)).map((p) => p.id);
}
