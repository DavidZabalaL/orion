import Link from "next/link";
import { CreditCard, Fuel, Gauge, DollarSign } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { Table, EmptyState } from "@/components/ui/table";
import { fmtMoney, fmtFecha } from "@/lib/formato";
import { CombustibleForm } from "@/components/combustible/combustible-form";

export const dynamic = "force-dynamic";

export default async function CombustiblePage() {
  const [unidades, transacciones, agregados] = await Promise.all([
    prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } }),
    prisma.combustible.findMany({ orderBy: { fecha: "desc" }, take: 25 }),
    prisma.combustible.aggregate({ _sum: { litros: true, costo: true }, _avg: { rendimientoCalculado: true } }),
  ]);

  const rendimientoPorUnidad = await prisma.combustible.groupBy({
    by: ["numeroEconomico"],
    _avg: { rendimientoCalculado: true },
    _sum: { litros: true, costo: true },
    orderBy: { numeroEconomico: "asc" },
  });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Combustible
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Consumo, rendimiento y anomalías — importador agnóstico de proveedor.
          </p>
        </div>
        <Link href="/combustible/mapeo-tarjetas" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <CreditCard size={16} /> Mapeo tarjeta → económico
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Litros acumulados" value={`${Number(agregados._sum.litros ?? 0).toLocaleString("es-MX")} L`} icon={Fuel} accent="var(--color-primary)" />
        <StatCard label="Gasto acumulado" value={fmtMoney(agregados._sum.costo)} icon={DollarSign} accent="var(--color-status-cerrado)" />
        <StatCard label="Rendimiento promedio flota" value={`${Number(agregados._avg.rendimientoCalculado ?? 0).toFixed(1)} km/L`} icon={Gauge} accent="var(--color-status-revision)" />
        <StatCard label="Unidades con carga" value={rendimientoPorUnidad.length} icon={Fuel} accent="var(--color-status-asignado)" />
      </div>

      <CombustibleForm unidades={unidades} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Transacciones recientes
          </h3>
          {transacciones.length === 0 ? (
            <EmptyState>Sin transacciones registradas.</EmptyState>
          ) : (
            <Table headers={["Fecha", "Unidad", "Litros", "Costo", "Km", "Rendimiento"]} minWidth={640}>
              {transacciones.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtFecha(t.fecha)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{t.numeroEconomico}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{Number(t.litros).toFixed(1)} L</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{fmtMoney(t.costo)}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{t.kmActual}</td>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{t.rendimientoCalculado ? `${Number(t.rendimientoCalculado).toFixed(1)} km/L` : "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Rendimiento por unidad
          </h3>
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            {rendimientoPorUnidad.length === 0 ? (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin datos aún.</p>
            ) : (
              rendimientoPorUnidad.map((r) => (
                <div key={r.numeroEconomico} className="flex items-center justify-between">
                  <Link href={`/unidades/${r.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
                    {r.numeroEconomico}
                  </Link>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
                    {r._avg.rendimientoCalculado ? `${Number(r._avg.rendimientoCalculado).toFixed(1)} km/L` : "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
