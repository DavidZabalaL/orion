import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { WizardRescate } from "@/components/rescate/wizard-rescate";

export const dynamic = "force-dynamic";

export default async function NuevoRescatePage() {
  await requerirPermisoModulo("R", "editar");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("R");

  const [unidades, motivos] = await Promise.all([
    prisma.unidad.findMany({
      where: {
        estatus: { not: "BAJA" },
        ...(proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {}),
      },
      select: { numeroEconomico: true, tipoVehiculo: true, proyecto: { select: { nombre: true } } },
      orderBy: { numeroEconomico: "asc" },
    }),
    prisma.catalogoMotivoRescate.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-lg mx-auto">
      <div>
        <Link href="/rescate" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Nuevo ticket de rescate
        </h1>
      </div>

      <WizardRescate
        unidades={unidades.map((u) => ({
          numeroEconomico: u.numeroEconomico,
          tipoVehiculo: u.tipoVehiculo,
          proyectoNombre: u.proyecto?.nombre ?? null,
        }))}
        motivos={motivos}
      />
    </div>
  );
}
