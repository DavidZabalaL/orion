import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NuevaOrdenForm } from "@/components/mantenimiento/nueva-orden-form";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

export default async function NuevaOrdenPage() {
  await requerirPermisoModulo("C", "editar");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("C");

  const [unidades, proyectos] = await Promise.all([
    prisma.unidad.findMany({
      where: { estatus: { not: "BAJA" }, ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}) },
      select: { numeroEconomico: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-2xl">
      <div>
        <Link href="/mantenimiento" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Ficha de Orden — Nueva
        </h1>
      </div>

      <div className="rounded-xl p-5" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <NuevaOrdenForm unidades={unidades} proyectos={proyectos} />
      </div>
    </div>
  );
}
