"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo, esRolGlobal } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";
import { invalidarCacheBI } from "@/lib/bi/invalidar";
import { parseFechaLocalMx } from "@/lib/timezone";

export type ResultadoAccionProyecto = { ok: boolean; error?: string };

export async function crearProyecto(formData: FormData): Promise<ResultadoAccionProyecto> {
  try {
    await exigirPermisoModulo("H", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const estadoRepublica = String(formData.get("estadoRepublica") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");

  if (!nombre || !estadoRepublica || !fechaInicio) {
    return { ok: false, error: "Nombre, estado y fecha de inicio son obligatorios." };
  }

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      estadoRepublica,
      fechaInicio: parseFechaLocalMx(fechaInicio)!,
      estatus: "ACTIVO",
      presupuestoAprobadoAnual: 0,
      modulosActivos: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L"],
      procesosActivos: ["checklist_diario"],
    },
  });

  const sesionCrear = await auth();
  if (sesionCrear?.user?.id) {
    await logActivity({
      userId: sesionCrear.user.id,
      modulo: "proyectos",
      accion: "create",
      entidad: "Proyecto",
      entidadId: proyecto.id,
      detalle: { nombre, estadoRepublica },
    });
  }

  revalidatePath("/proyectos");
  invalidarCacheBI(["proyectos"]);
  // El presupuesto por partida se carga aparte (opcional) justo después de crear el proyecto.
  redirect(`/proyectos/${proyecto.id}/presupuesto/importar`);
}

export async function actualizarProyecto(formData: FormData): Promise<ResultadoAccionProyecto> {
  if (!(await esRolGlobal())) return { ok: false, error: "Solo el Administrador puede editar proyectos." };

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const estadoRepublica = String(formData.get("estadoRepublica") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const estatus = String(formData.get("estatus") ?? "");

  if (!id || !nombre || !estadoRepublica || !fechaInicio) {
    return { ok: false, error: "Nombre, estado y fecha de inicio son obligatorios." };
  }
  if (estatus !== "ACTIVO" && estatus !== "CERRADO") {
    return { ok: false, error: "Estatus inválido." };
  }

  await prisma.proyecto.update({
    where: { id },
    data: { nombre, estadoRepublica, fechaInicio: parseFechaLocalMx(fechaInicio)!, estatus },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "proyectos",
      accion: "update",
      entidad: "Proyecto",
      entidadId: id,
      detalle: { nombre, estadoRepublica, estatus },
    });
  }

  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
  invalidarCacheBI(["proyectos"]);
  return { ok: true };
}

export async function eliminarProyecto(formData: FormData): Promise<ResultadoAccionProyecto> {
  if (!(await esRolGlobal())) return { ok: false, error: "Solo el Administrador puede eliminar proyectos." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Proyecto inválido." };

  const [unidades, operadores, gastos, combustible, tags] = await Promise.all([
    prisma.unidad.count({ where: { proyectoId: id } }),
    prisma.operador.count({ where: { proyectoId: id } }),
    prisma.gastoVehicular.count({ where: { proyectoReportanteId: id } }),
    prisma.combustible.count({ where: { proyectoReportanteId: id } }),
    prisma.tag.count({ where: { proyectoReportanteId: id } }),
  ]);

  if (unidades + operadores + gastos + combustible + tags > 0) {
    return {
      ok: false,
      error: "Este proyecto ya tiene unidades, operadores o gasto asociado y no se puede eliminar. Ciérralo en su lugar (estatus Cerrado) desde Editar.",
    };
  }

  try {
    await prisma.proyecto.delete({ where: { id } });
  } catch {
    return { ok: false, error: "No se pudo eliminar: el proyecto todavía tiene datos asociados." };
  }

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "proyectos", accion: "delete", entidad: "Proyecto", entidadId: id });
  }

  revalidatePath("/proyectos");
  invalidarCacheBI(["proyectos"]);
  return { ok: true };
}

export async function actualizarPresupuestoAprobado(formData: FormData): Promise<ResultadoAccionProyecto> {
  try {
    await exigirPermisoModulo("H", "aprobar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const id = String(formData.get("id") ?? "");
  const presupuestoAprobadoAnual = parseFloat(String(formData.get("presupuestoAprobadoAnual") ?? ""));

  if (!id || isNaN(presupuestoAprobadoAnual) || presupuestoAprobadoAnual < 0) {
    return { ok: false, error: "Monto inválido." };
  }

  const permitidos = await proyectosPermitidosParaModulo("H");
  if (permitidos !== null && !permitidos.includes(id)) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  await prisma.proyecto.update({ where: { id }, data: { presupuestoAprobadoAnual } });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "proyectos",
      accion: "update",
      entidad: "Proyecto",
      entidadId: id,
      detalle: { campo: "presupuestoAprobadoAnual", nuevo: presupuestoAprobadoAnual },
    });
  }

  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
  invalidarCacheBI(["proyectos"]);
  return { ok: true };
}

export async function actualizarPresupuestoMensual(formData: FormData): Promise<ResultadoAccionProyecto> {
  try {
    await exigirPermisoModulo("H", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const proyectoId = String(formData.get("proyectoId") ?? "");
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const mes = parseInt(String(formData.get("mes") ?? ""), 10);
  const montoAsignado = parseFloat(String(formData.get("montoAsignado") ?? ""));

  if (!proyectoId || !anio || !mes || isNaN(montoAsignado) || montoAsignado < 0) {
    return { ok: false, error: "Datos inválidos." };
  }

  const permitidos = await proyectosPermitidosParaModulo("H");
  if (permitidos !== null && !permitidos.includes(proyectoId)) {
    return { ok: false, error: "No tienes permiso para realizar esta acción." };
  }

  await prisma.presupuestoMensual.upsert({
    where: { proyectoId_anio_mes: { proyectoId, anio, mes } },
    create: { proyectoId, anio, mes, montoAsignado },
    update: { montoAsignado },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "proyectos",
      accion: "update",
      entidad: "PresupuestoMensual",
      entidadId: proyectoId,
      detalle: { anio, mes, montoAsignado },
    });
  }

  revalidatePath(`/proyectos/${proyectoId}`);
  revalidatePath("/proyectos");
  invalidarCacheBI(["proyectos"]);
  return { ok: true };
}
