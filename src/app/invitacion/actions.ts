"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

export type ResultadoAceptarInvitacion = { ok: boolean; error?: string };

const MIN_PASSWORD = 8;

export async function aceptarInvitacionOperador(formData: FormData): Promise<ResultadoAceptarInvitacion> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmarPassword = String(formData.get("confirmarPassword") ?? "");

  if (!token) return { ok: false, error: "Enlace inválido." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirmarPassword) return { ok: false, error: "Las contraseñas no coinciden." };

  // No usa exigirPermisoModulo: es una ruta pública (sin sesión) — la única
  // "autorización" es poseer el token de un solo uso enviado por correo.
  const usuario = await prisma.usuario.findUnique({ where: { invitacionToken: token } });

  if (!usuario || usuario.metodoAcceso !== "CORREO_PASSWORD" || usuario.estatus === "DESACTIVADO") {
    return { ok: false, error: "Enlace inválido o ya utilizado." };
  }
  if (!usuario.invitacionExpiraEn || usuario.invitacionExpiraEn.getTime() < Date.now()) {
    return { ok: false, error: "Este enlace expiró. Pide a un administrador que te reenvíe la invitación." };
  }

  const passwordHash = await hash(password, 10);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash,
      estatus: "ACTIVO",
      invitacionToken: null,
      invitacionExpiraEn: null,
    },
  });

  await logActivity({ userId: usuario.id, modulo: "auth", accion: "update", detalle: { evento: "acepta_invitacion_operador" } });

  return { ok: true };
}
