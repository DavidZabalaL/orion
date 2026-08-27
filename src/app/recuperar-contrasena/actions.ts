"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { enviarRecuperacionContrasena } from "@/lib/email";

const VIGENCIA_RECUPERACION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type ResultadoSolicitarRecuperacion = { ok: true };

/**
 * Ruta pública (sin sesión). Siempre regresa el mismo resultado exista o no
 * el correo — no se debe revelar si una cuenta existe en el sistema
 * (evita enumeración de correos). Solo aplica a cuentas con
 * metodoAcceso=CORREO_PASSWORD (operadores sin correo institucional); las
 * de Microsoft no tienen contraseña que restablecer aquí.
 */
export async function solicitarRecuperacionContrasena(formData: FormData): Promise<ResultadoSolicitarRecuperacion> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();

  if (correo) {
    const usuario = await prisma.usuario.findUnique({ where: { correo } });
    if (usuario && usuario.metodoAcceso === "CORREO_PASSWORD" && usuario.estatus === "ACTIVO") {
      const invitacionToken = randomBytes(32).toString("hex");
      const invitacionExpiraEn = new Date(Date.now() + VIGENCIA_RECUPERACION_MS);

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { invitacionToken, invitacionExpiraEn },
      });

      await enviarRecuperacionContrasena({ correo, nombre: usuario.nombre, token: invitacionToken });
    }
  }

  return { ok: true };
}
