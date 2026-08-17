"use server";

import { auth } from "@/auth";
import { registrarAccesoReporteBI, type AccionAccesoBI, type TipoRecursoBI } from "@/lib/bi/auditoria";

/**
 * Registro de gobernanza para acciones que no pasan por un endpoint que ya
 * registre auditoría por su cuenta (ver /api/bi/exportar): exportación de
 * imagen (100% client-side, se sube aquí solo para el registro) y "vio" una
 * vista/explorador (con throttling en el cliente vía sessionStorage, para no
 * escribir un registro en cada re-render de navegación normal).
 */
export async function registrarAccesoBI(input: {
  tipoRecurso: TipoRecursoBI;
  accion: AccionAccesoBI;
  recursoId?: string;
  datasetIds?: string[];
  proyectoIds?: string[];
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await registrarAccesoReporteBI({ userId: session.user.id, ...input });
}
