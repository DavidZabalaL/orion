import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ImportadorCombustible } from "@/components/importador/importador-combustible";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { prisma } from "@/lib/prisma";

export default async function ImportarCombustiblePage() {
  await requerirPermisoModulo("D", "editar");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("D");
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl">
      <div>
        <Link href="/combustible" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Combustible
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Importar transacciones de combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Sube el reporte del proveedor (Efectivale u otro), mapea las columnas y confirma antes de guardar.
        </p>
      </div>

      <ImportadorCombustible proyectos={proyectos} />
    </div>
  );
}
