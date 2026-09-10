import Link from "next/link";
import { Plus, FolderKanban, Car, DollarSign, Wallet, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { fmtMoney } from "@/lib/formato";
import { obtenerResumenPresupuestoAnual, obtenerPresupuestoAprobadoPorProyecto, obtenerGastoMesPorProyecto } from "@/lib/presupuesto";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { ProyectosLista } from "@/components/proyectos/proyectos-lista";
import { SelectorMesAnio } from "@/components/proyectos/selector-mes-anio";

export const dynamic = "force-dynamic";

const MESES_LABEL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  await requerirPermisoModulo("H");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("H");

  const ahora = new Date();
  const { anio: anioParam, mes: mesParam } = await searchParams;
  const anioActual = ahora.getFullYear();
  const anioMes = parseInt(anioParam ?? "", 10) || anioActual;
  const mesSeleccionado = parseInt(mesParam ?? "", 10) || ahora.getMonth() + 1;
  const esMesActual = anioMes === ahora.getFullYear() && mesSeleccionado === ahora.getMonth() + 1;

  const proyectos = await prisma.proyecto.findMany({
    where: proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : undefined,
    include: { unidades: { select: { numeroEconomico: true } } },
    orderBy: { nombre: "asc" },
  });

  const [resumenes, presupuestoPorProyecto, gastoMesPorProyecto] = await Promise.all([
    Promise.all(proyectos.map((p) => obtenerResumenPresupuestoAnual(p.id, anioActual))),
    obtenerPresupuestoAprobadoPorProyecto(anioActual),
    obtenerGastoMesPorProyecto(proyectos.map((p) => p.id), anioMes, mesSeleccionado),
  ]);
  const resumenPorProyecto = new Map(proyectos.map((p, i) => [p.id, resumenes[i]]));

  const presupuestoTotal = proyectos.reduce((acc, p) => acc + (presupuestoPorProyecto.get(p.id) ?? 0), 0);
  const gastadoTotal = resumenes.reduce((acc, r) => acc + r.gastoAnual, 0);
  const gastoMesTotal = proyectos.reduce((acc, p) => acc + (gastoMesPorProyecto.get(p.id)?.gastoMes ?? 0), 0);
  const unidadesAsignadas = proyectos.reduce((acc, p) => acc + p.unidades.length, 0);

  const labelMes = esMesActual ? "Gasto del mes en curso" : `Gasto de ${MESES_LABEL[mesSeleccionado - 1]} ${anioMes}`;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Proyectos
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Estructura de proyectos por estado de la república y presupuesto anual.
          </p>
        </div>
        <Link href="/proyectos/nuevo" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Plus size={16} /> Nuevo proyecto
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Proyectos activos" value={proyectos.filter((p) => p.estatus === "ACTIVO").length} icon={FolderKanban} accent="var(--color-primary)" />
        <StatCard label="Unidades asignadas" value={unidadesAsignadas} icon={Car} accent="var(--color-status-cerrado)" />
        <StatCard label={`Presupuesto aprobado ${anioActual}`} value={fmtMoney(presupuestoTotal)} icon={Wallet} accent="var(--color-status-asignado)" />
        <StatCard label={`Gastado en ${anioActual}`} value={fmtMoney(gastadoTotal)} icon={DollarSign} accent="var(--color-status-revision)" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label={labelMes} value={fmtMoney(gastoMesTotal)} icon={CalendarDays} accent="var(--color-status-escena)" />
        <div className="flex items-center justify-end gap-2">
          <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Ver gasto de:</span>
          <SelectorMesAnio anio={anioMes} mes={mesSeleccionado} />
        </div>
      </div>

      <ProyectosLista
        anio={anioActual}
        labelMes={labelMes}
        proyectos={proyectos.map((p) => {
          const resumen = resumenPorProyecto.get(p.id)!;
          const presupuestoAprobadoAnual = presupuestoPorProyecto.get(p.id) ?? 0;
          const pct = presupuestoAprobadoAnual > 0 ? (resumen.gastoAnual / presupuestoAprobadoAnual) * 100 : 0;
          const gastoMes = gastoMesPorProyecto.get(p.id);
          return {
            id: p.id,
            nombre: p.nombre,
            estadoRepublica: p.estadoRepublica,
            numUnidades: p.unidades.length,
            presupuestoAprobadoAnual,
            gastoAnual: resumen.gastoAnual,
            pct,
            gastoMes: gastoMes?.gastoMes ?? 0,
            estatus: p.estatus,
          };
        })}
      />
    </div>
  );
}
