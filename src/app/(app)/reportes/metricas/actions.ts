"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { exigirPermisoModulo } from "@/lib/permisos";
import { logActivity } from "@/lib/activity";
import { metricaEsValida } from "@/lib/bi/metricas";
import { obtenerDataset } from "@/lib/bi/metadata";

export type ResultadoMetrica = { ok: boolean; error?: string; id?: string };

const MAX_FILTROS_BASE = 20;
const MAX_VALORES_POR_FILTRO = 100;

function normalizarClave(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function validarFiltrosBase(filtros: unknown, datasetId: string): { campoId: string; valores: string[] }[] | null {
  if (filtros === undefined || filtros === null) return [];
  if (!Array.isArray(filtros) || filtros.length > MAX_FILTROS_BASE) return null;
  const dataset = obtenerDataset(datasetId);
  if (!dataset) return null;
  const limpios: { campoId: string; valores: string[] }[] = [];
  for (const f of filtros) {
    if (!f || typeof f !== "object") return null;
    const { campoId, valores } = f as Record<string, unknown>;
    if (typeof campoId !== "string" || !dataset.campos.some((c) => c.id === campoId)) return null;
    if (!Array.isArray(valores) || valores.length > MAX_VALORES_POR_FILTRO || !valores.every((v) => typeof v === "string")) return null;
    limpios.push({ campoId, valores: valores.map((v: string) => v.slice(0, 200)) });
  }
  return limpios;
}

export type InputMetrica = {
  id?: string;
  clave?: string;
  nombre: string;
  descripcion?: string;
  datasetId: string;
  campoId: string;
  agregacion: string;
  filtrosBase?: unknown;
};

export async function guardarMetrica(input: InputMetrica): Promise<ResultadoMetrica> {
  await exigirPermisoModulo("J", "editar");

  const nombre = input.nombre.trim().slice(0, 120);
  if (!nombre) return { ok: false, error: "Ponle un nombre a la métrica." };

  if (!metricaEsValida(input.datasetId, input.campoId, input.agregacion)) {
    return { ok: false, error: "El dataset, campo o agregación elegidos no son válidos." };
  }

  const filtrosBase = validarFiltrosBase(input.filtrosBase, input.datasetId);
  if (filtrosBase === null) return { ok: false, error: "Filtros base inválidos." };

  const clave = normalizarClave(input.clave || nombre);
  if (!clave) return { ok: false, error: "No se pudo derivar una clave válida del nombre." };

  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) return { ok: false, error: "Sesión inválida." };

  try {
    if (input.id) {
      const actualizada = await prisma.metricaBI.update({
        where: { id: input.id },
        data: {
          nombre,
          descripcion: input.descripcion?.trim().slice(0, 300) || null,
          datasetId: input.datasetId,
          campoId: input.campoId,
          agregacion: input.agregacion,
          filtrosBaseJson: filtrosBase,
        },
      });
      await logActivity({ userId: usuarioId, modulo: "reportes", accion: "update", entidad: "MetricaBI", entidadId: actualizada.id, detalle: { nombre } });
      revalidatePath("/reportes/metricas");
      return { ok: true, id: actualizada.id };
    }

    const creada = await prisma.metricaBI.create({
      data: {
        clave,
        nombre,
        descripcion: input.descripcion?.trim().slice(0, 300) || null,
        datasetId: input.datasetId,
        campoId: input.campoId,
        agregacion: input.agregacion,
        filtrosBaseJson: filtrosBase,
        creadoPorId: usuarioId,
      },
    });
    await logActivity({ userId: usuarioId, modulo: "reportes", accion: "create", entidad: "MetricaBI", entidadId: creada.id, detalle: { nombre, clave } });
    revalidatePath("/reportes/metricas");
    return { ok: true, id: creada.id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return { ok: false, error: "Ya existe una métrica con esa clave." };
    }
    return { ok: false, error: "No se pudo guardar la métrica." };
  }
}

export async function alternarMetrica(id: string, activo: boolean): Promise<ResultadoMetrica> {
  await exigirPermisoModulo("J", "editar");
  await prisma.metricaBI.update({ where: { id }, data: { activo } });
  revalidatePath("/reportes/metricas");
  return { ok: true };
}

export async function eliminarMetrica(id: string): Promise<ResultadoMetrica> {
  await exigirPermisoModulo("J", "editar");

  const session = await auth();
  try {
    await prisma.metricaBI.delete({ where: { id } });
  } catch {
    return { ok: false, error: "No se pudo eliminar la métrica." };
  }
  if (session?.user?.id) {
    await logActivity({ userId: session.user.id, modulo: "reportes", accion: "delete", entidad: "MetricaBI", entidadId: id });
  }
  revalidatePath("/reportes/metricas");
  return { ok: true };
}
