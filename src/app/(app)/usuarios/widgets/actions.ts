"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { CATALOGO_WIDGETS_UNIDADES, esLayoutValido, generarLayoutsPorDefecto, type WidgetConfigItem } from "@/lib/widgets";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";

export type ResultadoConfiguracionWidgets = { ok: boolean; error?: string };

export async function actualizarConfiguracionWidgets(moduloId: string, widgets: WidgetConfigItem[]): Promise<ResultadoConfiguracionWidgets> {
  if (!(await esRolGlobal())) return { ok: false, error: "Solo Administrador puede modificar los widgets." };
  if (!moduloId) return { ok: false, error: "Módulo inválido." };

  // Revalida cada widget contra el catálogo real (nunca se confía en lo que
  // mande el cliente) — mismo criterio que valida BiDashboardEditor para sus
  // propios widgets: solo ids conocidos, layout con la forma correcta.
  const layoutsPorDefecto = generarLayoutsPorDefecto(CATALOGO_WIDGETS_UNIDADES);
  const catalogoIds = new Set(CATALOGO_WIDGETS_UNIDADES.map((w) => w.id));
  if (!Array.isArray(widgets)) return { ok: false, error: "Widgets inválidos." };

  const widgetsValidados: WidgetConfigItem[] = CATALOGO_WIDGETS_UNIDADES.map((w) => {
    const enviado = widgets.find((v) => v?.id === w.id);
    return {
      id: w.id,
      activo: Boolean(enviado?.activo),
      layout: enviado && esLayoutValido(enviado.layout) ? enviado.layout : layoutsPorDefecto[w.id],
    };
  }).filter((w) => catalogoIds.has(w.id));

  await prisma.configuracionWidgets.upsert({
    where: { moduloId },
    update: { widgets: widgetsValidados },
    create: { moduloId, widgets: widgetsValidados },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "ConfiguracionWidgets",
      entidadId: moduloId,
      detalle: { widgets: widgetsValidados },
    });
  }

  revalidatePath("/usuarios/widgets");
  revalidatePath("/unidades");
  return { ok: true };
}
