"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPermisoModulo } from "@/lib/permisos";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";

export type ResultadoDepartamento = { ok: boolean; error?: string; id?: string };

export async function crearDepartamento(formData: FormData): Promise<ResultadoDepartamento> {
  try {
    await exigirPermisoModulo("K", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };

  try {
    const creado = await prisma.departamentoApoyo.create({ data: { nombre } });
    const sesion = await auth();
    if (sesion?.user?.id) {
      await logActivity({ userId: sesion.user.id, modulo: "usuarios", accion: "create", entidad: "DepartamentoApoyo", entidadId: creado.id, detalle: { nombre } });
    }
    revalidatePath("/usuarios/departamentos");
    return { ok: true, id: creado.id };
  } catch {
    return { ok: false, error: "Ya existe un departamento con ese nombre." };
  }
}

export async function renombrarDepartamento(formData: FormData): Promise<ResultadoDepartamento> {
  try {
    await exigirPermisoModulo("K", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const id = String(formData.get("id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!id || !nombre) return { ok: false, error: "Nombre inválido." };

  try {
    await prisma.departamentoApoyo.update({ where: { id }, data: { nombre } });
    revalidatePath("/usuarios/departamentos");
    return { ok: true, id };
  } catch {
    return { ok: false, error: "Ya existe un departamento con ese nombre." };
  }
}

/**
 * "Quitar" un departamento es un soft-delete (activo=false) — nunca se borra
 * la fila, así los gastos que ya lo tenían asignado (GastoVehicular.departamentoApoyoId)
 * conservan la referencia y el nombre intactos; el departamento simplemente
 * deja de ofrecerse como opción nueva. `activo=true` lo vuelve a mostrar.
 */
export async function alternarActivoDepartamento(formData: FormData): Promise<ResultadoDepartamento> {
  try {
    await exigirPermisoModulo("K", "editar");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No tienes permiso para realizar esta acción." };
  }

  const id = String(formData.get("id") ?? "");
  const activo = formData.get("activo") === "true";
  if (!id) return { ok: false, error: "Departamento inválido." };

  await prisma.departamentoApoyo.update({ where: { id }, data: { activo } });

  const sesion = await auth();
  if (sesion?.user?.id) {
    await logActivity({ userId: sesion.user.id, modulo: "usuarios", accion: activo ? "reactivar" : "desactivar", entidad: "DepartamentoApoyo", entidadId: id });
  }

  revalidatePath("/usuarios/departamentos");
  return { ok: true, id };
}
