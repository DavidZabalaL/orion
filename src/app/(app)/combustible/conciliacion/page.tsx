import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import type { SearchParamsFiltros } from "@/lib/filtros-gasto";
import { FiltrosGasto } from "@/components/ui/filtros-gasto";
import { TOLERANCIA_IMPORTE, TOLERANCIA_LITROS } from "@/lib/conciliacion-combustible";
import { cargarConciliacionCombustible, isoDiaMx } from "@/lib/conciliacion-combustible-datos";
import { ConciliacionCombustibleTabla } from "@/components/dashboard/conciliacion-combustible-tabla";

export const dynamic = "force-dynamic";

export default async function ConciliacionCombustiblePage({ searchParams }: { searchParams: Promise<SearchParamsFiltros> }) {
  await requerirPermisoModulo("D");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("D");
  const sp = await searchParams;

  const [{ filas, filtros, ultimaImportada }, proyectos] = await Promise.all([
    cargarConciliacionCombustible(sp, proyectosPermitidos),
    prisma.proyecto.findMany({
      where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/combustible" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a Combustible
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Conciliación de cargas de combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Cruza cada checklist de carga con la transacción real (misma unidad, mismo día ± 1). Concilia si litros e importe coinciden con una
          tolerancia de ±{TOLERANCIA_LITROS} L y ±${TOLERANCIA_IMPORTE}. Transacciones importadas hasta el{" "}
          <strong>{ultimaImportada ? isoDiaMx(ultimaImportada) : "—"}</strong>; los checklists posteriores quedan pendientes.
        </p>
      </div>

      <FiltrosGasto filtros={filtros} proyectos={proyectos} placeholderBusqueda="Número económico…" />

      <ConciliacionCombustibleTabla filas={JSON.parse(JSON.stringify(filas))} filtros={sp} rango={`${filtros.desde}_${filtros.hasta}`} />
    </div>
  );
}
