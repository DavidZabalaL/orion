"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { esRolGlobal, tienePermisoModulo } from "@/lib/permisos";
import { validarConfigComparador, ejecutarComparador } from "@/lib/bi/comparador";
import type { ConfigComparador, ResultadoMetricaComparador } from "@/lib/bi/comparador-tipos";

export type ResultadoComparar = { ok: true; resultados: ResultadoMetricaComparador[] } | { ok: false; error: string };

export async function compararPeriodos(input: unknown): Promise<ResultadoComparar> {
  if (!(await tienePermisoModulo("M"))) return { ok: false, error: "No tienes permiso para usar el comparador." };
  const validado = validarConfigComparador(input);
  if (!validado.ok) return validado;
  try {
    return { ok: true, resultados: await ejecutarComparador(validado.config) };
  } catch (error) {
    console.error("Error en compararPeriodos", error);
    return { ok: false, error: "No se pudo calcular la comparación. Intenta de nuevo." };
  }
}

export type ComparacionGuardadaVista = { id: string; nombre: string; config: ConfigComparador; creadoPorId: string };
type ResultadoGuardado = { ok: true; comparacion: ComparacionGuardadaVista } | { ok: false; error: string };

/** Mismo criterio que las vistas de dashboard: guardar exige "editar" en Dashboards; editar/borrar una existente, ser quien la creó o rol global. */
async function puedeModificar(id: string, usuarioId: string): Promise<string | null> {
  const existente = await prisma.comparacionGuardada.findUnique({ where: { id }, select: { creadoPorId: true } });
  if (!existente) return "La comparación ya no existe.";
  if (existente.creadoPorId !== usuarioId && !(await esRolGlobal())) return "Solo quien creó esta comparación o un Administrador puede modificarla.";
  return null;
}

export async function guardarComparacion(input: { id?: string; nombre: string; config: unknown }): Promise<ResultadoGuardado> {
  if (!(await tienePermisoModulo("M", "editar"))) return { ok: false, error: "No tienes permiso para guardar comparaciones." };
  const usuarioId = (await auth())?.user?.id;
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };
  const nombre = typeof input.nombre === "string" ? input.nombre.trim().slice(0, 120) : "";
  if (!nombre) return { ok: false, error: "Ponle un nombre a la comparación." };
  const validado = validarConfigComparador(input.config);
  if (!validado.ok) return validado;
  const config = validado.config;

  try {
    if (input.id) {
      const error = await puedeModificar(input.id, usuarioId);
      if (error) return { ok: false, error };
      const r = await prisma.comparacionGuardada.update({ where: { id: input.id }, data: { nombre, config }, select: { id: true, creadoPorId: true } });
      revalidatePath("/dashboards");
      return { ok: true, comparacion: { ...r, nombre, config } };
    }
    const r = await prisma.comparacionGuardada.create({ data: { nombre, config, creadoPorId: usuarioId }, select: { id: true, creadoPorId: true } });
    revalidatePath("/dashboards");
    return { ok: true, comparacion: { ...r, nombre, config } };
  } catch (error) {
    console.error("Error en guardarComparacion", error);
    return { ok: false, error: "No se pudo guardar la comparación." };
  }
}

export async function eliminarComparacion(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await tienePermisoModulo("M", "editar"))) return { ok: false, error: "No tienes permiso para eliminar comparaciones." };
  const usuarioId = (await auth())?.user?.id;
  if (!usuarioId) return { ok: false, error: "Sesión no válida." };
  if (typeof id !== "string" || !id) return { ok: false, error: "Comparación inválida." };
  const error = await puedeModificar(id, usuarioId);
  if (error) return { ok: false, error };
  await prisma.comparacionGuardada.delete({ where: { id } });
  revalidatePath("/dashboards");
  return { ok: true };
}
