import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type PermisoEspecial = { id: string; label: string };

export const PERMISOS_ESPECIALES: PermisoEspecial[] = [
  { id: "capacidadTanque", label: "Editar capacidad de tanque (Inventario de Unidades)" },
];

type PermisosJson = Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }>;

export async function tienePermisoEspecial(permisoId: string): Promise<boolean> {
  const session = await auth();
  const rolNombre = session?.user?.rol;
  if (!rolNombre) return false;

  const rol = await prisma.rol.findUnique({ where: { nombre: rolNombre }, select: { permisos: true } });
  const permisos = rol?.permisos as PermisosJson | undefined;
  if (!permisos) return false;
  if ("*" in permisos) return true;
  return permisos[permisoId]?.editar === true;
}

export async function puedeEditarCapacidadTanque(): Promise<boolean> {
  return tienePermisoEspecial("capacidadTanque");
}
