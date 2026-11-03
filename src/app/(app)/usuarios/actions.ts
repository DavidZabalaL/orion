"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { enviarInvitacion, enviarInvitacionOperador } from "@/lib/email";
import { exigirPermisoModulo, tienePermisoModulo, esRolGlobal, PERMISOS_ESPECIALES } from "@/lib/permisos";
import { obtenerProyectosAsignados, proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { esCorreoDevAdmin } from "@/lib/dev-admin";
import { MODULOS } from "@/lib/modulos";
import { logActivity } from "@/lib/activity";
import { hashToken } from "@/lib/secreto";

const VIGENCIA_INVITACION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

const IDS_MODULOS = new Set(MODULOS.map((m) => m.id));
const IDS_PERMISOS_ESPECIALES = new Set(PERMISOS_ESPECIALES.map((p) => p.id));

function rolTieneAccesoGlobal(permisos: unknown): boolean {
  if (Array.isArray(permisos)) return permisos.includes("*");
  return !!permisos && typeof permisos === "object" && "*" in (permisos as Record<string, unknown>);
}

/**
 * Editar permisos de roles equivale a poder otorgarse cualquier acceso, así
 * que se reserva al rol global (Administrador / equipo de Desarrollo) — no
 * basta con "editar" del módulo K. Además, nadie edita su propio rol.
 */
async function exigirEdicionDeRol(rolId: string): Promise<void> {
  await exigirPermisoModulo("K", "editar");
  if (!(await esRolGlobal())) throw new Error("Solo un Administrador puede modificar roles y permisos.");
  const session = await auth();
  const rol = await prisma.rol.findUnique({ where: { id: rolId }, select: { nombre: true } });
  if (!rol) throw new Error("Rol no encontrado.");
  if (session?.user?.rol && rol.nombre === session.user.rol) {
    throw new Error("No puedes modificar los permisos de tu propio rol.");
  }
}

/** Asignar un rol con acceso global ("*") solo lo puede hacer alguien que ya lo tiene. */
async function exigirAsignacionDeRol(rolId: string, sinCorreoInstitucional = false): Promise<void> {
  const rol = await prisma.rol.findUnique({ where: { id: rolId }, select: { nombre: true, permisos: true } });
  if (!rol) throw new Error("Rol no encontrado.");
  const esGlobalCaller = await esRolGlobal();
  const rolObjetivoGlobal = rolTieneAccesoGlobal(rol.permisos);
  if (rolObjetivoGlobal && !esGlobalCaller) {
    throw new Error("Solo un Administrador puede asignar un rol con acceso total.");
  }
  if (sinCorreoInstitucional) {
    if (rolObjetivoGlobal) {
      throw new Error("No se puede asignar acceso por contraseña a un rol con acceso total.");
    }
    if (!esGlobalCaller && rol.nombre !== "Operador") {
      throw new Error("Solo el rol Operador puede darse de alta sin correo institucional.");
    }
  }
}

async function exigirAccesoAUsuarioObjetivo(id: string) {
  const objetivo = await prisma.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      correo: true,
      rolId: true,
      operadorId: true,
      metodoAcceso: true,
      estatus: true,
      rol: { select: { nombre: true, permisos: true } },
      proyectos: { select: { proyectoId: true } },
    },
  });
  if (!objetivo) throw new Error("Usuario no encontrado.");

  if (!(await esRolGlobal())) {
    if (esCorreoDevAdmin(objetivo.correo) || rolTieneAccesoGlobal(objetivo.rol.permisos)) {
      throw new Error("Solo un Administrador puede modificar cuentas con acceso total.");
    }
    const permitidosK = await proyectosPermitidosParaModulo("K");
    const asignados = await obtenerProyectosAsignados();
    const permitidos = permitidosK !== null && permitidosK.length > 0 ? permitidosK : (asignados.todos ? null : asignados.ids);
    if (permitidos !== null) {
      const idsObjetivo = objetivo.proyectos.map((p) => p.proyectoId);
      if (idsObjetivo.length === 0 || !idsObjetivo.every((pid) => permitidos.includes(pid))) {
        throw new Error("No tienes permiso para administrar usuarios fuera de tus proyectos asignados.");
      }
    }
  }
  return objetivo;
}

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
  await exigirAsignacionDeRol(rolId, sinCorreoInstitucional);

  const asignados = await obtenerProyectosAsignados();
  if (!asignados.todos) {
    if (proyectoIds.length === 0 || !proyectoIds.every((pid) => asignados.ids.includes(pid))) {
      throw new Error("Solo puedes asignar proyectos a los que tienes acceso.");
    }
  }

  const metodoAcceso = sinCorreoInstitucional ? "CORREO_PASSWORD" : "MICROSOFT";
  // En BD solo se guarda el hash; el token en claro va únicamente en el enlace.
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
        invitacionToken: invitacionToken ? hashToken(invitacionToken) : null,
        invitacionExpiraEn,
        proyectos: { create: proyectoIds.map((proyectoId) => ({ proyectoId })) },
      },
    }),
    prisma.rol.findUniqueOrThrow({ where: { id: rolId }, select: { nombre: true } }),
    // Si esta cuenta es también un Operador, se espeja el proyecto principal
    // en Operador.proyectoId — lo sigue leyendo directo la ficha de operador
    // (y cualquier otro lugar que aún no pasó a usar UsuarioProyecto).
    ...(operadorId ? [prisma.operador.update({ where: { id: operadorId }, data: { proyectoId: proyectoIds[0] ?? null } })] : []),
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

  const usuario = await exigirAccesoAUsuarioObjetivo(id);
  if (usuario.estatus !== "INVITADO") {
    throw new Error("Solo se puede reenviar la invitación a cuentas con estatus Invitado.");
  }

  let token: string | null = null;

  if (usuario.metodoAcceso === "CORREO_PASSWORD") {
    if (rolTieneAccesoGlobal(usuario.rol.permisos)) {
      throw new Error("No se puede emitir un enlace de contraseña para un rol con acceso total.");
    }
    // Regenerar token siempre para que el enlace anterior quede inválido (en BD
    // solo vive el hash, así que el token anterior no se puede reenviar).
    token = randomBytes(32).toString("hex");
    await prisma.usuario.update({
      where: { id },
      data: { invitacionToken: hashToken(token), invitacionExpiraEn: new Date(Date.now() + VIGENCIA_INVITACION_MS) },
    });
  }

  const resultado = token
    ? await enviarInvitacionOperador({ correo: usuario.correo, nombre: usuario.nombre, token })
    : await enviarInvitacion({ correo: usuario.correo, nombre: usuario.nombre, rol: usuario.rol.nombre });

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

  const usuario = await exigirAccesoAUsuarioObjetivo(id);

  await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data: { estatus: nuevoEstatus } }),
    // Si esta cuenta es también un Operador, su estatus en "Gestión de
    // Operadores" debe reflejar lo mismo — antes quedaban desligados: se
    // desactivaba la cuenta de acceso aquí pero el operador seguía viéndose
    // "Activo" en /operadores, sin ninguna relación entre los dos.
    ...(usuario?.operadorId
      ? [prisma.operador.update({ where: { id: usuario.operadorId }, data: { estatus: nuevoEstatus === "DESACTIVADO" ? "BAJA" : "ACTIVO" } })]
      : []),
  ]);

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

  const actual = await exigirAccesoAUsuarioObjetivo(id);
  const session = await auth();
  const esGlobalCaller = await esRolGlobal();

  if (!esGlobalCaller) {
    const asignados = await obtenerProyectosAsignados();
    if (!asignados.todos) {
      if (proyectoIds.length === 0 || !proyectoIds.every((pid) => asignados.ids.includes(pid))) {
        throw new Error("Solo puedes asignar proyectos a los que tienes acceso.");
      }
    }
    if (session?.user?.id === id) {
      if (actual.rolId !== rolId) {
        throw new Error("No puedes cambiar tu propio rol.");
      }
      const proyectosActuales = new Set(actual.proyectos.map((p) => p.proyectoId));
      const mismosProyectos =
        proyectosActuales.size === proyectoIds.length && proyectoIds.every((pid) => proyectosActuales.has(pid));
      if (!mismosProyectos) {
        throw new Error("No puedes modificar tus propios proyectos asignados.");
      }
    }
  }

  if (actual.rolId !== rolId) {
    await exigirAsignacionDeRol(rolId, actual.metodoAcceso === "CORREO_PASSWORD");
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
    // Si esta cuenta es también un Operador, se espeja el proyecto principal
    // en Operador.proyectoId — lo sigue leyendo directo la ficha de operador
    // (y cualquier otro lugar que aún no pasó a usar UsuarioProyecto).
    ...(actual?.operadorId ? [prisma.operador.update({ where: { id: actual.operadorId }, data: { proyectoId: proyectoIds[0] ?? null } })] : []),
  ]);

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
    await exigirAccesoAUsuarioObjetivo(id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para eliminar este usuario." };
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

export async function crearRol(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await exigirPermisoModulo("K", "editar");
  if (!(await esRolGlobal())) return { ok: false, error: "Solo un Administrador puede crear roles." };

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "Ponle un nombre al rol." };

  const existente = await prisma.rol.findUnique({ where: { nombre } });
  if (existente) return { ok: false, error: "Ya existe un rol con ese nombre." };

  const rol = await prisma.rol.create({ data: { nombre, permisos: {} } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "usuarios", accion: "create", entidad: "Rol", entidadId: rol.id, detalle: { nombre } });
  }

  revalidatePath("/usuarios/roles");
  return { ok: true };
}

export async function actualizarPermisosRol(formData: FormData) {
  const rolId = String(formData.get("rolId") ?? "");
  await exigirEdicionDeRol(rolId);

  // Solo ids de módulo reales: nunca "*" (acceso global) ni claves arbitrarias.
  const modulos = String(formData.get("modulos") ?? "").split(",").filter((m) => IDS_MODULOS.has(m));

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
  const rolId = String(formData.get("rolId") ?? "");
  await exigirEdicionDeRol(rolId);

  const permisoId = String(formData.get("permisoId") ?? "");
  if (!IDS_PERMISOS_ESPECIALES.has(permisoId)) throw new Error("Permiso especial inválido.");
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
  const permitidos = await proyectosPermitidosParaModulo("K");
  if (permitidos !== null && !permitidos.includes(proyectoId)) {
    throw new Error("No tienes permiso para modificar este proyecto.");
  }
  const modulosActivos = formData.getAll("modulosActivos").map(String).filter((m) => IDS_MODULOS.has(m));
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
