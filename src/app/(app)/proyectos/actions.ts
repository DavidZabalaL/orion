"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export async function crearProyecto(formData: FormData) {
  await exigirPermisoModulo("H", "editar");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const estadoRepublica = String(formData.get("estadoRepublica") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const presupuestoAprobadoAnual = parseFloat(String(formData.get("presupuestoAprobadoAnual") ?? "0"));

  if (!nombre || !estadoRepublica || !fechaInicio) {
    throw new Error("Nombre, estado y fecha de inicio son obligatorios.");
  }

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      estadoRepublica,
      fechaInicio: new Date(fechaInicio),
      estatus: "ACTIVO",
      presupuestoAprobadoAnual,
      modulosActivos: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L"],
      procesosActivos: ["checklist_diario", "conciliacion_diaria"],
    },
  });

  revalidatePath("/proyectos");
  redirect(`/proyectos/${proyecto.id}`);
}

export async function actualizarPresupuestoAprobado(formData: FormData) {
  await exigirPermisoModulo("H", "aprobar");

  const id = String(formData.get("id") ?? "");
  const presupuestoAprobadoAnual = parseFloat(String(formData.get("presupuestoAprobadoAnual") ?? ""));

  if (!id || isNaN(presupuestoAprobadoAnual) || presupuestoAprobadoAnual < 0) {
    throw new Error("Monto inválido.");
  }

  const permitidos = await proyectosPermitidosParaModulo("H");
  if (permitidos !== null && !permitidos.includes(id)) throw new Error("No tienes permiso para realizar esta acción.");

  await prisma.proyecto.update({ where: { id }, data: { presupuestoAprobadoAnual } });

  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
}

export async function actualizarPresupuestoMensual(formData: FormData) {
  await exigirPermisoModulo("H", "editar");

  const proyectoId = String(formData.get("proyectoId") ?? "");
  const anio = parseInt(String(formData.get("anio") ?? ""), 10);
  const mes = parseInt(String(formData.get("mes") ?? ""), 10);
  const montoAsignado = parseFloat(String(formData.get("montoAsignado") ?? ""));

  if (!proyectoId || !anio || !mes || isNaN(montoAsignado) || montoAsignado < 0) {
    throw new Error("Datos inválidos.");
  }

  const permitidos = await proyectosPermitidosParaModulo("H");
  if (permitidos !== null && !permitidos.includes(proyectoId)) throw new Error("No tienes permiso para realizar esta acción.");

  await prisma.presupuestoMensual.upsert({
    where: { proyectoId_anio_mes: { proyectoId, anio, mes } },
    create: { proyectoId, anio, mes, montoAsignado },
    update: { montoAsignado },
  });

  revalidatePath(`/proyectos/${proyectoId}`);
  revalidatePath("/proyectos");
}
