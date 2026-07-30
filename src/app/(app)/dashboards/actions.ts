"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { tienePermisoModulo } from "@/lib/permisos";
import { obtenerDataset, obtenerCampo, agregacionesDisponibles, type WidgetDashboardBI, type TipoAgregacion, type LayoutWidget } from "@/lib/bi/metadata";

export type ResultadoVistaDashboard = { ok: boolean; error?: string; id?: string };

function validarLayout(layout: unknown): LayoutWidget | null {
  if (!layout || typeof layout !== "object") return null;
  const { x, y, w, h } = layout as Record<string, unknown>;
  if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
  return { x: x as number, y: y as number, w: w as number, h: h as number };
}

function validarWidgets(widgets: unknown): WidgetDashboardBI[] | null {
  if (!Array.isArray(widgets)) return null;
  const limpios: WidgetDashboardBI[] = [];
  for (const w of widgets) {
    if (!w || typeof w !== "object") return null;
    const { id, label, dataset, ejeX, ejeY, agregacion, tipoGrafica, layout } = w as Record<string, unknown>;
    if (typeof id !== "string" || typeof label !== "string") return null;
    if (typeof dataset !== "string" || typeof ejeX !== "string" || typeof ejeY !== "string") return null;
    if (tipoGrafica !== "barras" && tipoGrafica !== "lineas" && tipoGrafica !== "pie" && tipoGrafica !== "contador") return null;
    if (agregacion !== "conteo" && agregacion !== "suma" && agregacion !== "promedio") return null;

    const ds = obtenerDataset(dataset);
    const campoX = ds && obtenerCampo(ds, ejeX);
    const campoY = ds && obtenerCampo(ds, ejeY);
    if (!ds || !campoX || !campoY) return null;
    if (!agregacionesDisponibles(campoY).includes(agregacion as TipoAgregacion)) return null;

    const layoutValido = validarLayout(layout);
    if (!layoutValido) return null;

    limpios.push({ id, label: label.slice(0, 120), dataset, ejeX, ejeY, agregacion: agregacion as TipoAgregacion, tipoGrafica, layout: layoutValido });
  }
  return limpios;
}

export async function guardarVistaDashboard(input: { id?: string; nombre: string; widgets: WidgetDashboardBI[] }): Promise<ResultadoVistaDashboard> {
  if (!(await tienePermisoModulo("M", "editar"))) {
    return { ok: false, error: "No tienes permiso para guardar vistas de dashboard." };
  }

  const nombre = input.nombre.trim().slice(0, 120);
  if (!nombre) return { ok: false, error: "Ponle un nombre a la vista." };

  const widgets = validarWidgets(input.widgets);
  if (!widgets) return { ok: false, error: "Combinación inválida en uno de los widgets." };
  if (widgets.length === 0) return { ok: false, error: "Agrega al menos una combinación antes de guardar." };

  const session = await auth();
  const usuarioId = session?.user?.id;

  try {
    if (input.id) {
      const actualizada = await prisma.vistaDashboardBI.update({
        where: { id: input.id },
        data: { nombre, widgets },
      });
      revalidatePath("/dashboards");
      return { ok: true, id: actualizada.id };
    }

    const creada = await prisma.vistaDashboardBI.create({
      data: { nombre, widgets, creadoPorId: usuarioId ?? null },
    });
    revalidatePath("/dashboards");
    return { ok: true, id: creada.id };
  } catch {
    return { ok: false, error: "No se pudo guardar la vista." };
  }
}

export async function eliminarVistaDashboard(id: string): Promise<ResultadoVistaDashboard> {
  if (!(await tienePermisoModulo("M", "editar"))) {
    return { ok: false, error: "No tienes permiso para eliminar vistas de dashboard." };
  }
  if (!id) return { ok: false, error: "Vista inválida." };

  try {
    await prisma.vistaDashboardBI.delete({ where: { id } });
  } catch {
    return { ok: false, error: "No se pudo eliminar la vista." };
  }

  revalidatePath("/dashboards");
  return { ok: true };
}
