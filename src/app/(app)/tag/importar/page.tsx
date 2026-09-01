import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ImportadorTag } from "@/components/importador/importador-tag";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { prisma } from "@/lib/prisma";

export default async function ImportarTagPage() {
  await requerirPermisoModulo("E", "editar");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("E");
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl">
      <div>
        <Link href="/tag" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a TAG / Peajes
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Importar estado de cuenta de TAG
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Sube el estado de cuenta de IAVE, PASE o Televía, mapea las columnas y confirma antes de guardar. Las transacciones duplicadas y sin económico se detectan automáticamente.
        </p>
      </div>

      <ImportadorTag proyectos={proyectos} />
    </div>
  );
}
