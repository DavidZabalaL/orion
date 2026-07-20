import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { Ticket, DollarSign, CheckCircle2, Inbox } from "lucide-react";
import { TagForm } from "@/components/tag/tag-form";
import { TagRow } from "@/components/tag/tag-row";
import { TagPendienteRow } from "@/components/tag/tag-pendiente-row";

export const dynamic = "force-dynamic";

export default async function TagPage() {
  const [unidades, transacciones, pendientes, agregados] = await Promise.all([
    prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } }),
    prisma.tag.findMany({ where: { numeroEconomico: { not: null } }, orderBy: { fecha: "desc" }, take: 25 }),
    prisma.tag.findMany({ where: { numeroEconomico: null }, orderBy: { fecha: "desc" } }),
    prisma.tag.aggregate({ _sum: { monto: true }, _count: { _all: true } }),
  ]);

  const conciliadas = await prisma.tag.count({ where: { conciliado: true } });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          TAG / Peajes
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Gasto de casetas y conciliación cruzada con GPS.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Transacciones totales" value={agregados._count._all} icon={Ticket} accent="var(--color-primary)" />
        <StatCard label="Gasto acumulado" value={fmtMoney(agregados._sum.monto)} icon={DollarSign} accent="var(--color-status-cerrado)" />
        <StatCard label="Conciliadas" value={conciliadas} icon={CheckCircle2} accent="var(--color-status-asignado)" />
        <StatCard label="Pendientes de asignar" value={pendientes.length} icon={Inbox} accent="var(--color-status-revision)" />
      </div>

      <TagForm unidades={unidades} />

      {pendientes.length > 0 && (
        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--color-status-revision)" }}>
            Pendientes de asignar económico
          </h3>
          <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {["Fecha", "Caseta", "Monto", "Proveedor", "Asignar a"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <TagPendienteRow key={p.id} tag={JSON.parse(JSON.stringify(p))} unidades={unidades} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Conciliación TAG
        </h3>
        {transacciones.length === 0 ? (
          <EmptyState>Sin transacciones asignadas.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {["Fecha", "Unidad", "Caseta", "Monto", "Proveedor", "Conciliado", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transacciones.map((t) => (
                  <TagRow key={t.id} tag={JSON.parse(JSON.stringify(t))} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
