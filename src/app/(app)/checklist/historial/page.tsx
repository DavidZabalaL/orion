import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ChecklistHistorialLista } from "@/components/checklist/checklist-historial-lista";
import { SelectorFechaChecklist } from "@/components/checklist/selector-fecha-checklist";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";

export const dynamic = "force-dynamic";

function rangoDelDia(fecha: string) {
  const inicio = new Date(`${fecha}T00:00:00`);
  const fin = new Date(`${fecha}T23:59:59.999`);
  return { inicio, fin };
}

export default async function HistorialChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  await requerirPermisoModulo("A.1");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const { fecha: fechaParam } = await searchParams;
  const fecha = fechaParam ?? new Date().toISOString().slice(0, 10);
  const { inicio, fin } = rangoDelDia(fecha);

  const checklists = await prisma.checklist.findMany({
    where: {
      fecha: { gte: inicio, lte: fin },
      ...(proyectosPermitidos !== null ? { unidad: { proyectoId: { in: proyectosPermitidos } } } : {}),
    },
    include: {
      unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } },
      evidencia: { select: { url: true } },
      capturadoPor: { select: { nombre: true } },
    },
    orderBy: { fecha: "desc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/checklist" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a checklist
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Historial de checklists por fecha
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Consulta y exporta uno o varios checklists de un día específico.
        </p>
      </div>

      <SelectorFechaChecklist fecha={fecha} />

      <ChecklistHistorialLista checklists={JSON.parse(JSON.stringify(checklists))} fecha={fecha} />
    </div>
  );
}
