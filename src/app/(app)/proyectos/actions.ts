"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function crearProyecto(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const estadoRepublica = String(formData.get("estadoRepublica") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "");
  const presupuestoSemanal = parseFloat(String(formData.get("presupuestoSemanal") ?? "0"));

  if (!nombre || !estadoRepublica || !fechaInicio) {
    throw new Error("Nombre, estado y fecha de inicio son obligatorios.");
  }

  const proyecto = await prisma.proyecto.create({
    data: {
      nombre,
      estadoRepublica,
      fechaInicio: new Date(fechaInicio),
      estatus: "ACTIVO",
      presupuestoSemanal,
      semanaActualGastado: 0,
      modulosActivos: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "L"],
      procesosActivos: ["checklist_diario", "conciliacion_diaria"],
    },
  });

  revalidatePath("/proyectos");
  redirect(`/proyectos/${proyecto.id}`);
}

export async function redistribuirPresupuesto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const presupuestoSemanal = parseFloat(String(formData.get("presupuestoSemanal") ?? "0"));

  if (!id || isNaN(presupuestoSemanal)) throw new Error("Monto inválido.");

  await prisma.proyecto.update({ where: { id }, data: { presupuestoSemanal } });

  revalidatePath(`/proyectos/${id}`);
  revalidatePath("/proyectos");
}
