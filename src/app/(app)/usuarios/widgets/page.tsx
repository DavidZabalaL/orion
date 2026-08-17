import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo, esRolGlobal } from "@/lib/permisos";
import { redirect } from "next/navigation";
import { CATALOGO_WIDGETS_UNIDADES, WIDGETS_DEFAULT_UNIDADES, tamanoWidgetPorDefecto, esTamanoWidgetValido, type WidgetConfigItem } from "@/lib/widgets";
import { WidgetsConfigForm } from "@/components/usuarios/widgets-config-form";

export const dynamic = "force-dynamic";

export default async function ConfigurarWidgetsPage() {
  await requerirPermisoModulo("K");
  if (!(await esRolGlobal())) redirect("/sin-acceso");

  const config = await prisma.configuracionWidgets.findUnique({ where: { moduloId: "A" } });
  const widgetsGuardados = (config?.widgets as WidgetConfigItem[] | undefined) ?? null;

  const widgetsActuales: WidgetConfigItem[] = CATALOGO_WIDGETS_UNIDADES.map((w) => {
    const guardado = widgetsGuardados?.find((g) => g.id === w.id);
    return {
      id: w.id,
      activo: guardado ? guardado.activo : WIDGETS_DEFAULT_UNIDADES.includes(w.id),
      tamano: esTamanoWidgetValido(guardado?.tamano) ? guardado.tamano : tamanoWidgetPorDefecto(w.tipo),
    };
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Administración
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Widgets del resumen — Inventario de Unidades
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Elige qué recuadros de resumen se muestran a todos los usuarios en la parte superior de Inventario de Unidades, y su tamaño.
        </p>
      </div>

      <WidgetsConfigForm moduloId="A" catalogo={CATALOGO_WIDGETS_UNIDADES} widgetsActuales={widgetsActuales} />
    </div>
  );
}
