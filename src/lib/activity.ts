import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type LogActivityInput = {
  userId: string;
  /** Módulo de origen, ej. "vehiculos", "checklist", "mantenimiento", "documentos", "operadores", "auth". */
  modulo: string;
  /** Tipo de acción, ej. "login", "logout", "create", "update", "view", "delete_attempt". */
  accion: string;
  /** Tipo de entidad afectada, ej. "Unidad", "Checklist", "DocumentoOperador". */
  entidad?: string;
  /** Id del registro afectado (para Unidad, su número económico). */
  entidadId?: string;
  /** Campo(s) modificado(s) con su valor anterior y nuevo. */
  detalle?: Prisma.InputJsonValue;
};

/**
 * Registra un evento en ActivityLog (append-only: nunca se actualiza ni se
 * borra un registro desde el código — ver política de inmutabilidad en el
 * modelo, prisma/schema.prisma). Se llama desde cualquier Server Action o
 * Route Handler inmediatamente después de una mutación exitosa.
 *
 * Nunca lanza: un fallo al registrar actividad no debe tumbar la mutación real.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const hdrs = await headers();
      ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || null;
      userAgent = hdrs.get("user-agent");
    } catch {
      // headers() no está disponible fuera de una petición (ej. eventos de NextAuth
      // en ciertos flujos) — se registra el evento igual, solo sin ip/userAgent.
    }

    await prisma.activityLog.create({
      data: {
        userId: input.userId,
        modulo: input.modulo,
        accion: input.accion,
        entidad: input.entidad ?? null,
        entidadId: input.entidadId ?? null,
        detalle: input.detalle ?? undefined,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar actividad", error);
  }
}
