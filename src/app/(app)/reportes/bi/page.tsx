import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { BiExplorer } from "@/components/bi/bi-explorer";

export const dynamic = "force-dynamic";

export default async function BiPage() {
  await requerirPermisoModulo("J");

  const proyectosPermitidos = await proyectosPermitidosParaModulo("J");
  const proyectosDisponibles = await prisma.proyecto.findMany({
    where: proyectosPermitidos === null ? undefined : { id: { in: proyectosPermitidos } },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/reportes" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver al dashboard
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Explorador de BI
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Combina cualquier dimensión (eje X) con cualquier métrica (eje Y) de los módulos ya etiquetados.
        </p>
      </div>

      <BiExplorer proyectosDisponibles={proyectosDisponibles} />
    </div>
  );
}
