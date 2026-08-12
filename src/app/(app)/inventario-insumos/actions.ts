"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export type ResultadoSimple = { ok: boolean; error?: string };

export async function crearInsumo(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("N", "editar");

  const proyectoId = String(formData.get("proyectoId") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const unidad = String(formData.get("unidad") ?? "pza").trim();
  const existencias = parseFloat(String(formData.get("existencias") ?? "0")) || 0;
  const minimoStock = parseFloat(String(formData.get("minimoStock") ?? "0")) || 0;

  if (!proyectoId || !nombre) return { ok: false, error: "Proyecto y nombre son obligatorios." };

  const permitidos = await proyectosPermitidosParaModulo("N");
  if (permitidos !== null && !permitidos.includes(proyectoId)) {
    return { ok: false, error: "No tienes permiso para ese proyecto." };
  }

  await prisma.insumoInventario.create({
    data: { proyectoId, nombre, categoria, unidad, existencias: existencias as never, minimoStock: minimoStock as never },
  });

  revalidatePath("/inventario-insumos");
  return { ok: true };
}

export async function actualizarInsumo(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("N", "editar");

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const unidad = String(formData.get("unidad") ?? "pza").trim();
  const existencias = parseFloat(String(formData.get("existencias") ?? "0")) || 0;
  const minimoStock = parseFloat(String(formData.get("minimoStock") ?? "0")) || 0;

  if (!id || !nombre) return { ok: false, error: "Faltan datos obligatorios." };

  const actual = await prisma.insumoInventario.findUnique({ where: { id }, select: { proyectoId: true } });
  if (!actual) return { ok: false, error: "Insumo no encontrado." };

  const permitidos = await proyectosPermitidosParaModulo("N");
  if (permitidos !== null && !permitidos.includes(actual.proyectoId)) {
    return { ok: false, error: "No tienes permiso para ese proyecto." };
  }

  await prisma.insumoInventario.update({ where: { id }, data: { nombre, categoria, unidad, existencias: existencias as never, minimoStock: minimoStock as never } });

  revalidatePath("/inventario-insumos");
  return { ok: true };
}

export async function eliminarInsumo(formData: FormData): Promise<ResultadoSimple> {
  await exigirPermisoModulo("N", "editar");

  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "Falta el ID." };

  const actual = await prisma.insumoInventario.findUnique({ where: { id }, select: { proyectoId: true } });
  if (!actual) return { ok: false, error: "Insumo no encontrado." };

  const permitidos = await proyectosPermitidosParaModulo("N");
  if (permitidos !== null && !permitidos.includes(actual.proyectoId)) {
    return { ok: false, error: "No tienes permiso para ese proyecto." };
  }

  await prisma.insumoInventario.delete({ where: { id } });

  revalidatePath("/inventario-insumos");
  return { ok: true };
}
