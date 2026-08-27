import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { MODULOS } from "@/lib/modulos";
import { esCorreoDevAdmin } from "@/lib/dev-admin";

export type PermisoEspecial = { id: string; label: string };

export const PERMISOS_ESPECIALES: PermisoEspecial[] = [
  { id: "capacidadTanque", label: "Editar capacidad de tanque (Inventario de Unidades)" },
  { id: "cargarPresupuesto", label: "Cargar / reemplazar presupuesto por partida (Proyectos)" },
  { id: "verSlaDisponibilidad", label: "Ver SLA de disponibilidad por unidad (Inventario de Unidades)" },
];

type PermisosJson = Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }>;

/**
 * true si la sesión actual pertenece al equipo de Desarrollo (allowlist por
 * variable de entorno, ver src/lib/dev-admin.ts) — acceso total e irrevocable,
 * deliberadamente independiente de la tabla `Rol`: ningún cambio de permisos
 * hecho desde /usuarios/roles puede quitarlo ni otorgarlo.
 */
export async function esDevAdmin(): Promise<boolean> {
  const session = await auth();
  return esCorreoDevAdmin(session?.user?.email);
}

async function obtenerPermisosDelRol(): Promise<PermisosJson | null> {
  const session = await auth();
  const rolNombre = session?.user?.rol;
  if (!rolNombre) return null;

  const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre }, select: { permisos: true } });
  return (rol?.permisos as PermisosJson | undefined) ?? null;
}

/** true si el rol actual tiene acceso global ("*"), como el Administrador o el equipo de Desarrollo — sin restricción de proyecto. */
export async function esRolGlobal(): Promise<boolean> {
  if (await esDevAdmin()) return true;
  const permisos = await obtenerPermisosDelRol();
  return !!permisos && "*" in permisos;
}

export async function tienePermisoEspecial(permisoId: string): Promise<boolean> {
  if (await esDevAdmin()) return true;
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

/**
 * Ver el detalle de una póliza de seguro (aseguradora, costo, coberturas) es más sensible
 * que el nivel "ver" genérico del módulo F: Control Vehicular la captura pero no debe
 * consultarla después. Reservado a Administrador (vía esRolGlobal) y, por nombre de rol,
 * a Dirección y Gerente administrativo — si alguno de esos roles se renombra desde
 * /usuarios/roles, esta lista debe actualizarse.
 */
const ROLES_VER_POLIZA_SEGURO = ["Dirección", "Gerente administrativo", "Jurídico"];
const ROLES_DESCARGAR_POLIZA_SEGURO = ["Dirección", "Jurídico"];
/** Corregir cualquier campo de una póliza ya existente (aseguradora, número, fechas, costo,
 * coberturas) — más allá de crear/renovar/subir documento, que ya cubre el permiso "editar"
 * genérico del módulo F. */
const ROLES_EDITAR_POLIZA_COMPLETA_SEGURO = ["Jurídico"];

export async function puedeEditarPolizaCompletaSeguro(): Promise<boolean> {
  if (await esRolGlobal()) return true;
  const session = await auth();
  return !!session?.user?.rol && ROLES_EDITAR_POLIZA_COMPLETA_SEGURO.includes(session.user.rol);
}

export async function puedeVerPolizaSeguro(): Promise<boolean> {
  if (await esRolGlobal()) return true;
  const session = await auth();
  return !!session?.user?.rol && ROLES_VER_POLIZA_SEGURO.includes(session.user.rol);
}

/** Descargar el PDF cargado de la póliza (o su tarjeta imprimible) — más restrictivo que verla. */
export async function puedeDescargarPolizaSeguro(): Promise<boolean> {
  if (await esRolGlobal()) return true;
  const session = await auth();
  return !!session?.user?.rol && ROLES_DESCARGAR_POLIZA_SEGURO.includes(session.user.rol);
}

export async function requerirVerPolizaSeguro(): Promise<void> {
  if (!(await puedeVerPolizaSeguro())) redirect("/sin-acceso");
}

export async function requerirDescargarPolizaSeguro(): Promise<void> {
  if (!(await puedeDescargarPolizaSeguro())) redirect("/sin-acceso");
}

/**
 * Administrador (rol global "*") la tiene siempre, vía tienePermisoEspecial —
 * para cualquier otro rol, solo si el Administrador se la otorga
 * explícitamente desde /usuarios/roles.
 */
export async function puedeVerSlaDisponibilidad(): Promise<boolean> {
  return tienePermisoEspecial("verSlaDisponibilidad");
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
  if (await esDevAdmin()) return true;
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
  if (await esDevAdmin()) return MODULOS.map((m) => m.id);
  const permisos = await obtenerPermisosDelRol();
  if (!permisos) return [];
  if ("*" in permisos) return MODULOS.map((m) => m.id);
  return MODULOS.filter((m) => nivelDe(permisos[m.id]) !== null).map((m) => m.id);
}

/** Para Server Components: redirige a /sin-acceso si la sesión no es del equipo de Desarrollo. */
export async function requerirDevAdmin(): Promise<void> {
  if (!(await esDevAdmin())) redirect("/sin-acceso");
}
