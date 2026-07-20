import Link from "next/link";
import { Plus, FolderKanban, Car, DollarSign, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const proyectos = await prisma.proyecto.findMany({
    include: { unidades: { select: { numeroEconomico: true } } },
    orderBy: { nombre: "asc" },
  });

  const presupuestoTotal = proyectos.reduce((acc, p) => acc + Number(p.presupuestoSemanal), 0);
  const gastadoTotal = proyectos.reduce((acc, p) => acc + Number(p.semanaActualGastado), 0);
  const unidadesAsignadas = proyectos.reduce((acc, p) => acc + p.unidades.length, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Proyectos y multi-estado
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Estructura de proyectos por estado de la república y presupuesto semanal (bolsa).
          </p>
        </div>
        <Link href="/proyectos/nuevo" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Plus size={16} /> Nuevo proyecto
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Proyectos activos" value={proyectos.filter((p) => p.estatus === "ACTIVO").length} icon={FolderKanban} accent="var(--color-primary)" />
        <StatCard label="Unidades asignadas" value={unidadesAsignadas} icon={Car} accent="var(--color-status-cerrado)" />
        <StatCard label="Presupuesto semanal total" value={fmtMoney(presupuestoTotal)} icon={Wallet} accent="var(--color-status-asignado)" />
        <StatCard label="Gastado esta semana" value={fmtMoney(gastadoTotal)} icon={DollarSign} accent="var(--color-status-revision)" />
      </div>

      {proyectos.length === 0 ? (
        <EmptyState>Sin proyectos registrados.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Proyecto", "Estado", "Unidades", "Presupuesto semanal", "Gastado", "Estatus"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proyectos.map((p) => {
                const pct = Number(p.presupuestoSemanal) > 0 ? (Number(p.semanaActualGastado) / Number(p.presupuestoSemanal)) * 100 : 0;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/proyectos/${p.id}`} style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{p.nombre}</Link>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.estadoRepublica}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{p.unidades.length}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(p.presupuestoSemanal)}</td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: pct > 90 ? "var(--color-status-escena)" : "var(--field-text)" }}>{fmtMoney(p.semanaActualGastado)} ({pct.toFixed(0)}%)</td>
                    <td className="px-4 py-3">
                      <Badge label={p.estatus === "ACTIVO" ? "Activo" : "Cerrado"} color={p.estatus === "ACTIVO" ? "var(--color-status-cerrado)" : "var(--sidebar-text)"} bg={p.estatus === "ACTIVO" ? "var(--status-cerrado-bg)" : "var(--chip)"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
