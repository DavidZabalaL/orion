import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { GastoProrrateadoForm } from "@/components/mantenimiento/gasto-prorrateado-form";

export const dynamic = "force-dynamic";

export default async function CargaProrrateadaPage() {
  await requerirPermisoModulo("C");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("C");

  const [unidades, proyectos] = await Promise.all([
    prisma.unidad.findMany({
      where: {
        estatus: { not: "BAJA" },
        ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
      },
      select: { numeroEconomico: true, proyectoId: true },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.proyecto.findMany({
      where: {
        estatus: "ACTIVO",
        ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}),
      },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" style={{ maxWidth: 720 }}>
      <div className="flex items-center gap-3">
        <Link
          href="/mantenimiento"
          className="flex items-center justify-center rounded-md h-9 w-9"
          style={{ background: "var(--chip)", color: "var(--sidebar-text)" }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1
            style={{
              fontFamily: "var(--font)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--sidebar-text-active)",
            }}
          >
            Carga prorrateada
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Distribuye un gasto total en partes iguales entre varias unidades en un solo paso.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}
      >
        <GastoProrrateadoForm unidades={unidades} proyectos={proyectos} />
      </div>
    </div>
  );
}
