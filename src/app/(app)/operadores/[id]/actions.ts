"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";

/**
 * Alterna ACTIVO/BAJA de un Operador desde "Gestión de Operadores". Si esta
 * persona tiene también una cuenta de acceso (Usuario), se sincroniza su
 * estatus — antes estaban desligados: desactivar la cuenta en Administración
 * de usuarios no se reflejaba aquí, y no existía ningún control para dar de
 * baja a un operador desde esta pantalla (el campo nunca se tocaba).
 */
export async function alternarEstatusOperador(formData: FormData) {
  await exigirPermisoModulo("L", "editar");

  const id = String(formData.get("id") ?? "");
  const estatusActual = String(formData.get("estatus") ?? "");
  const nuevoEstatus = estatusActual === "BAJA" ? "ACTIVO" : "BAJA";

  const operador = await prisma.operador.findUnique({ where: { id }, select: { usuario: { select: { id: true } } } });
  if (!operador) throw new Error("El operador no existe.");

  await prisma.$transaction([
    prisma.operador.update({ where: { id }, data: { estatus: nuevoEstatus as never } }),
    ...(operador.usuario
      ? [prisma.usuario.update({ where: { id: operador.usuario.id }, data: { estatus: nuevoEstatus === "BAJA" ? "DESACTIVADO" : "ACTIVO" } })]
      : []),
  ]);

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "operadores",
      accion: "update",
      entidad: "Operador",
      entidadId: id,
      detalle: { campo: "estatus", nuevo: nuevoEstatus },
    });
  }

  revalidatePath(`/operadores/${id}`);
  revalidatePath("/operadores");
  invalidarCacheBI(["operadores"]);
}

export async function actualizarOperador(formData: FormData) {
  await exigirPermisoModulo("L", "editar");

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const curp = String(formData.get("curp") ?? "").trim().toUpperCase();
  const rfc = String(formData.get("rfc") ?? "").trim().toUpperCase() || null;
  const nss = String(formData.get("nss") ?? "").trim() || null;
  const tipoSangre = String(formData.get("tipoSangre") ?? "") || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const contactoEmergencia = String(formData.get("contactoEmergencia") ?? "").trim() || null;
  const proyectoId = String(formData.get("proyectoId") ?? "") || null;
  const tipoLicenciaManejo = String(formData.get("tipoLicenciaManejo") ?? "") || null;

  if (!id || !nombre || !curp) {
    throw new Error("Nombre y CURP son obligatorios.");
  }

  const anterior = await prisma.operador.findUnique({ where: { id }, include: { usuario: { select: { id: true } } } });
  if (!anterior) throw new Error("El operador no existe.");

  const permitidos = await proyectosPermitidosParaModulo("L");
  if (permitidos !== null) {
    if (!anterior.proyectoId || !permitidos.includes(anterior.proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");
    if (proyectoId && !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para asignar ese proyecto.");
  }

  await prisma.$transaction([
    prisma.operador.update({
      where: { id },
      data: {
        nombre,
        curp,
        rfc,
        nss,
        tipoSangre: (tipoSangre as never) || null,
        telefono,
        contactoEmergencia,
        proyectoId,
        tipoLicenciaManejo: tipoLicenciaManejo || null,
      } as never,
    }),
    // Si este operador tiene cuenta de acceso (Usuario), se espeja el
    // proyecto aquí también en UsuarioProyecto — la fuente real de a qué
    // proyecto(s) puede entrar esa cuenta (Mi Turno, Checklist, etc.).
    ...(anterior.usuario
      ? [
          prisma.usuarioProyecto.deleteMany({ where: { usuarioId: anterior.usuario.id } }),
          prisma.usuario.update({
            where: { id: anterior.usuario.id },
            data: { proyectos: proyectoId ? { create: [{ proyectoId }] } : undefined },
          }),
        ]
      : []),
  ]);

  const session = await auth();
  if (session?.user?.id) {
    await prisma.bitacoraCambio.create({
      data: {
        entidad: "Operador",
        entidadId: id,
        usuarioId: session.user.id,
        accion: "EDITAR",
        valoresAnteriores: { nombre: anterior.nombre, curp: anterior.curp, proyectoId: anterior.proyectoId },
        valoresNuevos: { nombre, curp, proyectoId },
      },
    });
    await logActivity({
      userId: session.user.id,
      modulo: "operadores",
      accion: "update",
      entidad: "Operador",
      entidadId: id,
      detalle: { anterior: { nombre: anterior.nombre, curp: anterior.curp, proyectoId: anterior.proyectoId }, nuevo: { nombre, curp, proyectoId } },
    });
  }

  revalidatePath(`/operadores/${id}`);
  revalidatePath("/operadores");
  invalidarCacheBI(["operadores"]);
  redirect(`/operadores/${id}`);
}
