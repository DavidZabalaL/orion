import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MODULOS } from "@/lib/modulos";

export type PermisoEspecial = { id: string; label: string };

export const PERMISOS_ESPECIALES: PermisoEspecial[] = [
  { id: "capacidadTanque", label: "Editar capacidad de tanque (Inventario de Unidades)" },
  { id: "cargarPresupuesto", label: "Cargar / reemplazar presupuesto por partida (Proyectos)" },
];

type PermisosJson = Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }>;

async function obtenerPermisosDelRol(): Promise<PermisosJson | null> {
  const session = await auth();
  const rolNombre = session?.user?.rol;
  if (!rolNombre) return null;

  const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre }, select: { permisos: true } });
  return (rol?.permisos as PermisosJson | undefined) ?? null;
}

export async function tienePermisoEspecial(permisoId: string): Promise<boolean> {
  const permisos = await obtenerPermisosDelRol();
  if (!permisos) return false;
  if ("*" in permisos) return true;
  return permisos[permisoId]?.editar === true;
}

export async function puedeEditarCapacidadTanque(): Promise<boolean> {
  return tienePermisoEspecial("capacidadTanque");
}

export async function puedeCargarPresupuesto(): Promise<boolean> {
  return tienePermisoEspecial("cargarPresupuesto");
}

// ── Permisos por módulo (ver / editar / aprobar) ──
// Mismo campo Rol.permisos que ya administra /usuarios/roles (actualizarPermisosRol),
// aplicado por fin a cada página y Server Action de la plataforma.

export type NivelPermisoModulo = "ver" | "editar" | "aprobar";

const RANGO_NIVEL: Record<NivelPermisoModulo, number> = { ver: 1, editar: 2, aprobar: 3 };

function nivelDe(p?: { ver?: boolean; editar?: boolean; aprobar?: boolean }): NivelPermisoModulo | null {
  if (!p) return null;
  if (p.aprobar) return "aprobar";
  if (p.editar) return "editar";
  if (p.ver) return "ver";
  return null;
}

export async function tienePermisoModulo(moduloId: string, minimo: NivelPermisoModulo = "ver"): Promise<boolean> {
  const permisos = await obtenerPermisosDelRol();
  if (!permisos) return false;
  if ("*" in permisos) return true;
  const nivel = nivelDe(permisos[moduloId]);
  if (!nivel) return false;
  return RANGO_NIVEL[nivel] >= RANGO_NIVEL[minimo];
}

/** Para Server Components (páginas): redirige a /sin-acceso si falta el permiso. */
export async function requerirPermisoModulo(moduloId: string, minimo: NivelPermisoModulo = "ver"): Promise<void> {
  if (!(await tienePermisoModulo(moduloId, minimo))) redirect("/sin-acceso");
}

/** Para Server Actions: lanza error si falta el permiso (no confía en que la página ya lo validó). */
export async function exigirPermisoModulo(moduloId: string, minimo: NivelPermisoModulo = "editar"): Promise<void> {
  if (!(await tienePermisoModulo(moduloId, minimo))) {
    throw new Error("No tienes permiso para realizar esta acción.");
  }
}

/** Ids de módulo visibles para el rol actual (nivel "ver" o superior) — para filtrar el menú lateral. */
export async function obtenerModulosVisibles(): Promise<string[]> {
  const permisos = await obtenerPermisosDelRol();
  if (!permisos) return [];
  if ("*" in permisos) return MODULOS.map((m) => m.id);
  return MODULOS.filter((m) => nivelDe(permisos[m.id]) !== null).map((m) => m.id);
}
