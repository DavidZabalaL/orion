import Link from "next/link";
import { Plus, Wrench, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL, ESTATUS_GASTO_LABEL, ESTATUS_GASTO_STYLE } from "@/lib/categorias-gasto";
import { MarcarRealizadoButton } from "@/components/mantenimiento/marcar-realizado-button";

export const dynamic = "force-dynamic";

export default async function MantenimientoPage() {
  const [pendientes, historial, porCategoria] = await Promise.all([
    prisma.gastoVehicular.findMany({
      where: { estatus: "PROGRAMADO" },
      include: { unidad: { select: { numeroEconomico: true } } },
      orderBy: { fecha: "asc" },
    }),
    prisma.gastoVehicular.findMany({
      orderBy: { fecha: "desc" },
      take: 30,
      include: { unidad: { select: { numeroEconomico: true } } },
    }),
    prisma.gastoVehicular.groupBy({
      by: ["categoria"],
      _sum: { costo: true },
      _count: { _all: true },
      orderBy: { _sum: { costo: "desc" } },
    }),
  ]);

  const gastoTotal = porCategoria.reduce((acc, c) => acc + Number(c._sum.costo ?? 0), 0);
  const vencidos = pendientes.filter((p) => p.fecha < new Date());

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Mantenimiento y Gastos Vehiculares
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            12 categorías de gasto + campos administrativos SC / ODC / SAP.
          </p>
        </div>
        <Link href="/mantenimiento/nueva" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Plus size={16} /> Nueva orden
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Órdenes programadas" value={pendientes.length} icon={Clock} accent="var(--color-status-revision)" />
        <StatCard label="Vencidas / atrasadas" value={vencidos.length} icon={AlertTriangle} accent="var(--color-status-escena)" />
        <StatCard label="Gasto total registrado" value={fmtMoney(gastoTotal)} icon={DollarSign} accent="var(--color-primary)" />
        <StatCard label="Categorías con movimiento" value={porCategoria.length} icon={Wrench} accent="var(--color-status-cerrado)" />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Calendario / Pendientes
        </h3>
        {pendientes.length === 0 ? (
          <EmptyState>Sin órdenes programadas.</EmptyState>
        ) : (
          <Table headers={["Fecha", "Unidad", "Categoría", "Descripción", "Costo", ""]} minWidth={760}>
            {pendientes.map((g) => (
              <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: g.fecha < new Date() ? "var(--color-status-escena)" : "var(--field-text)" }}>
                  {fmtFecha(g.fecha)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/unidades/${g.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {g.numeroEconomico}
                  </Link>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{g.descripcion ?? "—"}</td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
                <td className="px-4 py-3"><MarcarRealizadoButton id={g.id} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Historial reciente
          </h3>
          {historial.length === 0 ? (
            <EmptyState>Sin gastos registrados.</EmptyState>
          ) : (
            <Table headers={["Fecha", "Unidad", "Categoría", "Costo", "Estatus"]} minWidth={640}>
              {historial.map((g) => (
                <tr key={g.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(g.fecha)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{g.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(g.costo)}</td>
                  <td className="px-4 py-3">
                    <Badge label={ESTATUS_GASTO_LABEL[g.estatus]} color={ESTATUS_GASTO_STYLE[g.estatus]?.color} bg={ESTATUS_GASTO_STYLE[g.estatus]?.bg} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Reporte por categoría
          </h3>
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            {porCategoria.map((c) => {
              const monto = Number(c._sum.costo ?? 0);
              const pct = gastoTotal > 0 ? (monto / gastoTotal) * 100 : 0;
              return (
                <div key={c.categoria}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[c.categoria]}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{fmtMoney(monto)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--chip)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
