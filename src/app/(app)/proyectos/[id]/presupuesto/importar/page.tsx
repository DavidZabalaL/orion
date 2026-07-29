import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { puedeCargarPresupuesto, requerirPermisoModulo } from "@/lib/permisos";
import { ImportadorPresupuesto } from "@/components/importador/importador-presupuesto";

export const dynamic = "force-dynamic";

export default async function ImportarPresupuestoPage({ params }: { params: Promise<{ id: string }> }) {
  await requerirPermisoModulo("H", "editar");
  const { id } = await params;

  const [proyecto, autorizado] = await Promise.all([
    prisma.proyecto.findUnique({ where: { id }, select: { id: true, nombre: true } }),
    puedeCargarPresupuesto(),
  ]);

  if (!proyecto) notFound();
  if (!autorizado) redirect(`/proyectos/${id}/presupuesto`);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl">
      <div>
        <Link href={`/proyectos/${id}/presupuesto`} className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Presupuesto por partida
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Importar presupuesto — {proyecto.nombre}
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          El archivo trae todos los proyectos de Grupo Kabat; puedes casar cada uno con el proyecto real de Orión antes de confirmar.
        </p>
      </div>

      <ImportadorPresupuesto proyectoIdActual={proyecto.id} volverHref={`/proyectos/${id}/presupuesto`} />
    </div>
  );
}
