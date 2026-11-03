"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { hashToken } from "@/lib/secreto";
import { esCorreoDevAdmin } from "@/lib/dev-admin";

export type ResultadoAceptarInvitacion = { ok: boolean; error?: string };

const MIN_PASSWORD = 8;
const VIGENCIA_RECUPERACION_MS = 60 * 60 * 1000; // 1 hora (emitido en /recuperar-contrasena)

export async function aceptarInvitacionOperador(formData: FormData): Promise<ResultadoAceptarInvitacion> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmarPassword = String(formData.get("confirmarPassword") ?? "");

  if (!token) return { ok: false, error: "Enlace inválido." };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` };
  if (password !== confirmarPassword) return { ok: false, error: "Las contraseñas no coinciden." };

  // No usa exigirPermisoModulo: es una ruta pública (sin sesión) — la única
  // "autorización" es poseer el token de un solo uso enviado por correo.
  const usuario = await prisma.usuario.findUnique({
    where: { invitacionToken: hashToken(token) },
    include: { rol: { select: { permisos: true } } },
  });

  const permisos = usuario?.rol?.permisos;
  const esGlobal =
    Array.isArray(permisos)
      ? permisos.includes("*")
      : !!permisos && typeof permisos === "object" && "*" in (permisos as Record<string, unknown>);

  if (
    !usuario ||
    usuario.metodoAcceso !== "CORREO_PASSWORD" ||
    usuario.estatus === "DESACTIVADO" ||
    esGlobal ||
    esCorreoDevAdmin(usuario.correo)
  ) {
    return { ok: false, error: "Enlace inválido o ya utilizado." };
  }
  if (!usuario.invitacionExpiraEn || usuario.invitacionExpiraEn.getTime() < Date.now()) {
    return { ok: false, error: "Este enlace expiró. Pide a un administrador que te reenvíe la invitación." };
  }
  // Un token de invitación (vigencia de 7 días) solo aplica a cuentas con estatus INVITADO;
  // una cuenta ya ACTIVA únicamente puede restablecer su contraseña con un enlace de /recuperar-contrasena (vigencia <= 1 hora).
  const esTokenRecuperacion = usuario.invitacionExpiraEn.getTime() - Date.now() <= VIGENCIA_RECUPERACION_MS;
  if (usuario.estatus !== "INVITADO" && !esTokenRecuperacion) {
    return { ok: false, error: "Esta cuenta ya está activa. Utiliza la opción de recuperar contraseña." };
  }

  const passwordHash = await hash(password, 10);

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash,
      estatus: "ACTIVO",
      invitacionToken: null,
      invitacionExpiraEn: null,
      // Cambiar la contraseña cierra cualquier sesión abierta con la anterior
      // (ver el callback `session` en src/auth.ts).
      sesionInvalidadaEn: new Date(),
    },
  });

  await logActivity({ userId: usuario.id, modulo: "auth", accion: "update", detalle: { evento: "acepta_invitacion_operador" } });

  return { ok: true };
}
