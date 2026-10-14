"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { enviarRecuperacionContrasena } from "@/lib/email";
import { hashToken } from "@/lib/secreto";
import { intentosExcedidos, ipDeEncabezados, registrarIntento } from "@/lib/limite-intentos";

const VIGENCIA_RECUPERACION_MS = 60 * 60 * 1000; // 1 hora

export type ResultadoSolicitarRecuperacion = { ok: true };

/**
 * Ruta pública (sin sesión). Siempre regresa el mismo resultado exista o no
 * el correo — no se debe revelar si una cuenta existe en el sistema
 * (evita enumeración de correos). Solo aplica a cuentas con
 * metodoAcceso=CORREO_PASSWORD (operadores sin correo institucional); las
 * de Microsoft no tienen contraseña que restablecer aquí. Limitada por cuenta
 * y por IP para que no se pueda usar para inundar buzones.
 */
export async function solicitarRecuperacionContrasena(formData: FormData): Promise<ResultadoSolicitarRecuperacion> {
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  if (!correo) return { ok: true };

  const ip = ipDeEncabezados(await headers());
  if (await intentosExcedidos("recuperacion", correo, ip)) return { ok: true };
  await registrarIntento("recuperacion", correo, ip, true);

  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (usuario && usuario.metodoAcceso === "CORREO_PASSWORD" && usuario.estatus === "ACTIVO") {
    // En BD solo se guarda el hash; el token en claro va únicamente en el correo.
    const token = randomBytes(32).toString("hex");
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { invitacionToken: hashToken(token), invitacionExpiraEn: new Date(Date.now() + VIGENCIA_RECUPERACION_MS) },
    });

    await enviarRecuperacionContrasena({ correo, nombre: usuario.nombre, token });
  }

  return { ok: true };
}
