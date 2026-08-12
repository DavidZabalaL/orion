import Link from "next/link";
import { Plus, FolderKanban, Car, DollarSign, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { fmtMoney } from "@/lib/formato";
import { obtenerResumenPresupuestoAnual } from "@/lib/presupuesto";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { ProyectosLista } from "@/components/proyectos/proyectos-lista";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  await requerirPermisoModulo("H");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("H");

  const anioActual = new Date().getFullYear();
  const proyectos = await prisma.proyecto.findMany({
    where: proyectosPermitidos !== null ? { id: { in: proyectosPermitidos } } : undefined,
    include: { unidades: { select: { numeroEconomico: true } } },
    orderBy: { nombre: "asc" },
  });

  const resumenes = await Promise.all(proyectos.map((p) => obtenerResumenPresupuestoAnual(p.id, anioActual)));
  const resumenPorProyecto = new Map(proyectos.map((p, i) => [p.id, resumenes[i]]));

  const presupuestoTotal = proyectos.reduce((acc, p) => acc + Number(p.presupuestoAprobadoAnual), 0);
  const gastadoTotal = resumenes.reduce((acc, r) => acc + r.gastoAnual, 0);
  const unidadesAsignadas = proyectos.reduce((acc, p) => acc + p.unidades.length, 0);

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

      <ProyectosLista
        anio={anioActual}
        proyectos={proyectos.map((p) => {
          const resumen = resumenPorProyecto.get(p.id)!;
          const pct = resumen.presupuestoAprobadoAnual > 0 ? (resumen.gastoAnual / resumen.presupuestoAprobadoAnual) * 100 : 0;
          return {
            id: p.id,
            nombre: p.nombre,
            estadoRepublica: p.estadoRepublica,
            numUnidades: p.unidades.length,
            presupuestoAprobadoAnual: Number(p.presupuestoAprobadoAnual),
            gastoAnual: resumen.gastoAnual,
            pct,
            estatus: p.estatus,
          };
        })}
      />
    </div>
  );
}
