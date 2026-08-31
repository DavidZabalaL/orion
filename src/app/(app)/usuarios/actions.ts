"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { enviarInvitacion, enviarInvitacionOperador } from "@/lib/email";
import { exigirPermisoModulo, tienePermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";

const VIGENCIA_INVITACION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type ResultadoInvitarUsuario = {
  id: string;
  correoEnviado: boolean;
  errorCorreo?: string;
  /** Solo con metodoAcceso=CORREO_PASSWORD: enlace de aceptación, para compartir a mano si el correo falla. */
  linkInvitacion?: string;
};

export async function invitarUsuario(formData: FormData): Promise<ResultadoInvitarUsuario> {
  await exigirPermisoModulo("K", "editar");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const correo = String(formData.get("correo") ?? "").trim().toLowerCase();
  const rolId = String(formData.get("rolId") ?? "");
  const operadorId = String(formData.get("operadorId") ?? "") || null;
  const proyectoIds = formData.getAll("proyectoIds").map(String);
  // Marcado desde el formulario cuando el Operador no tiene correo institucional:
  // entra con correo (personal) + contraseña propia en vez de cuenta Microsoft.
  const sinCorreoInstitucional = formData.get("sinCorreoInstitucional") === "1";

  if (!nombre || !correo || !rolId) {
    throw new Error("Nombre, correo y rol son obligatorios.");
  }

  const metodoAcceso = sinCorreoInstitucional ? "CORREO_PASSWORD" : "MICROSOFT";
  const invitacionToken = sinCorreoInstitucional ? randomBytes(32).toString("hex") : null;
  const invitacionExpiraEn = sinCorreoInstitucional ? new Date(Date.now() + VIGENCIA_INVITACION_MS) : null;

  const [usuario, rol] = await prisma.$transaction([
    prisma.usuario.create({
      data: {
        nombre,
        correo,
        rolId,
        operadorId,
        estatus: "INVITADO",
        metodoAcceso,
        invitacionToken,
        invitacionExpiraEn,
        proyectos: { create: proyectoIds.map((proyectoId) => ({ proyectoId })) },
      },
    }),
    prisma.rol.findUniqueOrThrow({ where: { id: rolId }, select: { nombre: true } }),
  ]);

  const resultadoCorreo = invitacionToken
    ? await enviarInvitacionOperador({ correo, nombre, token: invitacionToken })
    : await enviarInvitacion({ correo, nombre, rol: rol.nombre });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "create",
      entidad: "Usuario",
      entidadId: usuario.id,
      detalle: { nombre, correo, rol: rol.nombre, metodoAcceso },
    });
  }

  revalidatePath("/usuarios");
  return {
    id: usuario.id,
    correoEnviado: resultadoCorreo.enviado,
    errorCorreo: resultadoCorreo.error,
    linkInvitacion: invitacionToken ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invitacion/${invitacionToken}` : undefined,
  };
}

export type ResultadoReenviarInvitacion = {
  correoEnviado: boolean;
  errorCorreo?: string;
  linkInvitacion?: string;
};

export async function reenviarInvitacion(formData: FormData): Promise<ResultadoReenviarInvitacion> {
  await exigirPermisoModulo("K", "editar");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID de usuario requerido.");

  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id },
    select: { nombre: true, correo: true, metodoAcceso: true, invitacionToken: true, invitacionExpiraEn: true, estatus: true },
  });

  let token = usuario.invitacionToken;
  const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

  if (usuario.metodoAcceso === "CORREO_PASSWORD") {
    // Regenerar token siempre para que el enlace anterior quede inválido
    token = randomBytes(32).toString("hex");
    await prisma.usuario.update({
      where: { id },
      data: { invitacionToken: token, invitacionExpiraEn: new Date(Date.now() + VIGENCIA_MS) },
    });
  }

  const resultado = token
    ? await enviarInvitacionOperador({ correo: usuario.correo, nombre: usuario.nombre, token })
    : await enviarInvitacion({ correo: usuario.correo, nombre: usuario.nombre, rol: "" });

  return {
    correoEnviado: resultado.enviado,
    errorCorreo: resultado.error,
    linkInvitacion: token ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invitacion/${token}` : undefined,
  };
}

export async function alternarEstatusUsuario(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const id = String(formData.get("id") ?? "");
  const estatusActual = String(formData.get("estatus") ?? "");
  const nuevoEstatus = estatusActual === "DESACTIVADO" ? "ACTIVO" : "DESACTIVADO";
  await prisma.usuario.update({ where: { id }, data: { estatus: nuevoEstatus } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "Usuario",
      entidadId: id,
      detalle: { campo: "estatus", nuevo: nuevoEstatus },
    });
  }

  revalidatePath("/usuarios");
}

export async function actualizarUsuario(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rolId = String(formData.get("rolId") ?? "");
  const proyectoIds = formData.getAll("proyectoIds").map(String);

  if (!id || !nombre || !rolId) {
    throw new Error("Nombre y rol son obligatorios.");
  }

  await prisma.$transaction([
    prisma.usuarioProyecto.deleteMany({ where: { usuarioId: id } }),
    prisma.usuario.update({
      where: { id },
      data: {
        nombre,
        rolId,
        proyectos: { create: proyectoIds.map((proyectoId) => ({ proyectoId })) },
      },
    }),
  ]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "Usuario",
      entidadId: id,
      detalle: { nombre, rolId },
    });
  }

  revalidatePath("/usuarios");
}

export type ResultadoEliminarUsuario = { ok: boolean; error?: string };

export async function eliminarUsuario(formData: FormData): Promise<ResultadoEliminarUsuario> {
  if (!(await tienePermisoModulo("K", "editar"))) return { ok: false, error: "No tienes permiso para realizar esta acción." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Usuario inválido." };

  const session = await auth();
  if (session?.user?.id === id) {
    return { ok: false, error: "No puedes eliminar tu propia cuenta." };
  }

  try {
    await prisma.usuarioProyecto.deleteMany({ where: { usuarioId: id } });
    await prisma.usuario.delete({ where: { id } });
    if (session?.user?.id) {
      await logActivity({ userId: session.user.id, modulo: "usuarios", accion: "delete", entidad: "Usuario", entidadId: id });
    }
    revalidatePath("/usuarios");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Este usuario ya tiene historial asociado (checklists, auditorías, bitácora, etc.) y no se puede eliminar. Desactívalo en su lugar.",
    };
  }
}

export async function actualizarPermisosRol(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const rolId = String(formData.get("rolId") ?? "");
  const modulos = String(formData.get("modulos") ?? "").split(",");

  const rolActual = await prisma.rol.findUniqueOrThrow({ where: { id: rolId }, select: { permisos: true } });
  const permisos: Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }> = {
    ...(rolActual.permisos as Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }>),
  };
  for (const modulo of modulos) {
    const nivel = String(formData.get(`permiso_${modulo}`) ?? "ninguno");
    if (nivel === "ver") permisos[modulo] = { ver: true };
    else if (nivel === "editar") permisos[modulo] = { ver: true, editar: true };
    else if (nivel === "aprobar") permisos[modulo] = { ver: true, editar: true, aprobar: true };
    else delete permisos[modulo];
  }

  await prisma.rol.update({ where: { id: rolId }, data: { permisos } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "usuarios", accion: "update", entidad: "Rol", entidadId: rolId, detalle: { permisos } });
  }

  revalidatePath("/usuarios/roles");
}

export async function actualizarPermisoEspecial(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const rolId = String(formData.get("rolId") ?? "");
  const permisoId = String(formData.get("permisoId") ?? "");
  const activo = formData.get("activo") === "1";

  const rolActual = await prisma.rol.findUniqueOrThrow({ where: { id: rolId }, select: { permisos: true } });
  const permisos = {
    ...(rolActual.permisos as Record<string, { ver?: boolean; editar?: boolean; aprobar?: boolean }>),
    [permisoId]: { editar: activo },
  };

  await prisma.rol.update({ where: { id: rolId }, data: { permisos } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "Rol",
      entidadId: rolId,
      detalle: { permisoId, activo },
    });
  }

  revalidatePath("/usuarios/roles");
}

export async function actualizarModulosProyecto(formData: FormData) {
  await exigirPermisoModulo("K", "editar");

  const proyectoId = String(formData.get("proyectoId") ?? "");
  const modulosActivos = formData.getAll("modulosActivos").map(String);
  await prisma.proyecto.update({ where: { id: proyectoId }, data: { modulosActivos } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "Proyecto",
      entidadId: proyectoId,
      detalle: { modulosActivos },
    });
  }

  revalidatePath("/usuarios/proyectos");
}
