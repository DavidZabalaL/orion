import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ImportadorExcel } from "@/components/importador/importador-excel";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO" },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl">
      <div>
        <Link href="/altas-bajas" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Importar unidades desde Excel
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Sube tu archivo, elige la hoja, mapea cada columna a un campo de la plataforma y confirma antes de guardar.
        </p>
      </div>

      <ImportadorExcel proyectos={proyectos} />
    </div>
  );
}
