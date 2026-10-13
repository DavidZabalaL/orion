import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { obtenerComparativoCargaCombustible } from "@/app/(app)/checklist/actions";
import { SelectorFiltrosCombustible } from "@/components/checklist/selector-filtros-combustible";
import { ComparativoCombustibleLista } from "@/components/checklist/comparativo-combustible-lista";

export const dynamic = "force-dynamic";

export default async function ComparativoCombustiblePage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; proyectoId?: string; tipoVehiculo?: string; soloAlertas?: string }>;
}) {
  await requerirPermisoModulo("A.1");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("A.1");
  const { desde: desdeParam, hasta: hastaParam, proyectoId, tipoVehiculo, soloAlertas } = await searchParams;

  const hoy = new Date().toISOString().slice(0, 10);
  const desde = desdeParam ?? hoy;
  const hasta = hastaParam ?? hoy;
  const filtroSoloAlertas = soloAlertas === "1";

  const proyectos = await prisma.proyecto.findMany({
    where: { estatus: "ACTIVO", ...(proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const filasRaw = await obtenerComparativoCargaCombustible({ desde, hasta, proyectoId, tipoVehiculo });
  const filas = filasRaw.filter((f) => !filtroSoloAlertas || f.alertas.length > 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/checklist" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a checklist
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Comparativo de combustible
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Cargas registradas en el checklist (% antes/después, litros, importe) con posibles discrepancias detectadas automáticamente.
        </p>
      </div>

      <SelectorFiltrosCombustible desde={desde} hasta={hasta} proyectoId={proyectoId ?? ""} tipoVehiculo={tipoVehiculo ?? ""} soloAlertas={filtroSoloAlertas} proyectos={proyectos} />

      <ComparativoCombustibleLista filas={JSON.parse(JSON.stringify(filas))} />
    </div>
  );
}
