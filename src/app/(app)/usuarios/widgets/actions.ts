"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esRolGlobal } from "@/lib/permisos";
import { CATALOGO_WIDGETS_UNIDADES, esTamanoWidgetValido, tamanoWidgetPorDefecto, type WidgetConfigItem } from "@/lib/widgets";
import { auth } from "@/auth";
import { logActivity } from "@/lib/activity";

export async function actualizarConfiguracionWidgets(formData: FormData) {
  if (!(await esRolGlobal())) throw new Error("Solo Administrador puede modificar los widgets.");

  const moduloId = String(formData.get("moduloId") ?? "");
  if (!moduloId) throw new Error("Módulo inválido.");

  const widgets: WidgetConfigItem[] = CATALOGO_WIDGETS_UNIDADES.map((w) => {
    const tamano = formData.get(`tamano_${w.id}`);
    return {
      id: w.id,
      activo: formData.get(`activo_${w.id}`) === "on",
      tamano: esTamanoWidgetValido(tamano) ? tamano : tamanoWidgetPorDefecto(w.tipo),
    };
  });

  await prisma.configuracionWidgets.upsert({
    where: { moduloId },
    update: { widgets },
    create: { moduloId, widgets },
  });

  const session = await auth();
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      modulo: "usuarios",
      accion: "update",
      entidad: "ConfiguracionWidgets",
      entidadId: moduloId,
      detalle: { widgets },
    });
  }

  revalidatePath("/usuarios/widgets");
  revalidatePath("/unidades");
}
