import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const CLAVE_OCULTAR_SLA_DISPONIBILIDAD = "ocultar_sla_disponibilidad";

/** true si el usuario en sesión ocultó, para sí mismo, una preferencia identificada por `clave`. */
export async function preferenciaOcultaPorUsuario(clave: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const pref = await prisma.preferenciaUsuario.findUnique({
    where: { usuarioId_clave: { usuarioId: session.user.id, clave } },
  });
  return pref?.valor === true;
}
