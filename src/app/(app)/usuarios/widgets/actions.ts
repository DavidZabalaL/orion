"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { CATALOGO_WIDGETS_UNIDADES, type WidgetConfigItem } from "@/lib/widgets";

export async function actualizarConfiguracionWidgets(formData: FormData) {
  if (!(await esRolGlobal())) throw new Error("Solo Administrador puede modificar los widgets.");

  const moduloId = String(formData.get("moduloId") ?? "");
  if (!moduloId) throw new Error("Módulo inválido.");

  const widgets: WidgetConfigItem[] = CATALOGO_WIDGETS_UNIDADES.map((w) => ({
    id: w.id,
    label: String(formData.get(`label_${w.id}`) ?? w.labelDefault).trim() || w.labelDefault,
    activo: formData.get(`activo_${w.id}`) === "on",
  }));

  await prisma.configuracionWidgets.upsert({
    where: { moduloId },
    update: { widgets },
    create: { moduloId, widgets },
  });

  revalidatePath("/usuarios/widgets");
  revalidatePath("/unidades");
}
