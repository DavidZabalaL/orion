"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function crearTag(formData: FormData) {
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "") || null;
  const fecha = String(formData.get("fecha") ?? "");
  const monto = parseFloat(String(formData.get("monto") ?? "0"));
  const caseta = String(formData.get("caseta") ?? "").trim() || null;
  const proveedorTag = String(formData.get("proveedorTag") ?? "");

  if (!fecha || !monto || !proveedorTag) {
    throw new Error("Fecha, monto y proveedor son obligatorios.");
  }

  await prisma.tag.create({
    data: { numeroEconomico, fecha: new Date(fecha), monto, caseta, proveedorTag: proveedorTag as never, conciliado: false },
  });

  revalidatePath("/tag");
}

export async function conciliarTag(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.tag.update({ where: { id }, data: { conciliado: true } });
  revalidatePath("/tag");
}

export async function asignarEconomicoTag(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const numeroEconomico = String(formData.get("numeroEconomico") ?? "");
  if (!numeroEconomico) throw new Error("Selecciona una unidad.");
  await prisma.tag.update({ where: { id }, data: { numeroEconomico } });
  revalidatePath("/tag");
}
