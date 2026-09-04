import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tienePermisoModulo } from "@/lib/permisos";

/**
 * Quién es "yo" para efectos de "Mi Turno" (tomar/liberar una unidad, y de
 * quién es responsable en el checklist): un Operador real en su turno normal,
 * o —si el rol tiene "editar" en el módulo O pero la cuenta no está vinculada
 * a ningún Operador (ej. Control Vehicular, Gerente administrativo)— la
 * propia cuenta de Usuario, de forma excepcional. Compartido entre
 * src/app/(app)/operador/turno/actions.ts y src/app/(app)/checklist/actions.ts.
 */
export type IdentidadTurno = { operadorId: string } | { usuarioId: string };

/**
 * Resuelve la identidad de la sesión actual para "Mi Turno", o `null` si esta
 * cuenta simplemente no puede tomar/tener una unidad (no es Operador y su rol
 * no tiene "editar" en el módulo O) — un resultado normal y esperado, NO un
 * error: por eso esta función nunca lanza para ese caso, solo lo hace ante
 * una falla real (sin sesión, error de base de datos). Quien llame a esta
 * función decide si "no elegible" merece un mensaje de error propio (ej.
 * `tomarUnidad`, una acción explícita del usuario) o simplemente se trata
 * como "no soy responsable de nada" (ej. al armar el checklist).
 */
export async function resolverIdentidadTurno(): Promise<IdentidadTurno | null> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sin sesión.");

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { operadorId: true },
  });
  if (usuario?.operadorId) return { operadorId: usuario.operadorId };

  if (!(await tienePermisoModulo("O", "editar"))) return null;
  return { usuarioId: session.user.id };
}

export function mismaIdentidad(a: IdentidadTurno | null, b: { operadorId: string | null; usuarioId: string | null }): boolean {
  if (!a) return false;
  if ("operadorId" in a) return b.operadorId === a.operadorId;
  return b.usuarioId === a.usuarioId;
}
