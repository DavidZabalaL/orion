import Link from "next/link";
import { CreditCard, Fuel, Gauge, DollarSign, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { fmtMoney } from "@/lib/formato";
import { CombustibleForm } from "@/components/combustible/combustible-form";
import { CombustibleAcordeon, type GrupoCombustible } from "@/components/combustible/combustible-acordeon";
import { requerirPermisoModulo } from "@/lib/permisos";

export const dynamic = "force-dynamic";

export default async function CombustiblePage() {
  await requerirPermisoModulo("D");

  const [unidades, transacciones, agregados] = await Promise.all([
    prisma.unidad.findMany({ where: { estatus: { not: "BAJA" } }, select: { numeroEconomico: true }, orderBy: { numeroEconomico: "asc" } }),
    prisma.combustible.findMany({ orderBy: { fecha: "desc" } }),
    prisma.combustible.aggregate({ _sum: { litros: true, costo: true }, _avg: { rendimientoCalculado: true } }),
  ]);

  const rendimientoPorUnidad = await prisma.combustible.groupBy({
    by: ["numeroEconomico"],
    _avg: { rendimientoCalculado: true },
    _sum: { litros: true, costo: true },
    orderBy: { numeroEconomico: "asc" },
  });

  // Se agrupa por número económico, igual que ya hace TAG, para no perder
  // información en una sola lista plana: cada unidad se ve resumida y se
  // despliega bajo demanda.
  const gruposPorEconomico = new Map<string, GrupoCombustible>();
  for (const t of transacciones) {
    let grupo = gruposPorEconomico.get(t.numeroEconomico);
    if (!grupo) {
      grupo = { numeroEconomico: t.numeroEconomico, totalLitros: 0, totalCosto: 0, rendimientoPromedio: null, ultimaFecha: t.fecha.toISOString(), alertasPendientes: 0, transacciones: [] };
      gruposPorEconomico.set(t.numeroEconomico, grupo);
    }
    grupo.totalLitros += Number(t.litros);
    grupo.totalCosto += Number(t.costo);
    if (t.alertaSobrellenado) grupo.alertasPendientes += 1;
    grupo.transacciones.push(JSON.parse(JSON.stringify(t)));
  }
  for (const grupo of gruposPorEconomico.values()) {
    const conRendimiento = grupo.transacciones.filter((t) => t.rendimientoCalculado);
    grupo.rendimientoPromedio = conRendimiento.length
      ? conRendimiento.reduce((acc, t) => acc + Number(t.rendimientoCalculado), 0) / conRendimiento.length
      : null;
  }
  const grupos = Array.from(gruposPorEconomico.values()).sort((a, b) => a.numeroEconomico.localeCompare(b.numeroEconomico));

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
        <div className="flex items-center gap-2">
          <Link href="/combustible/mapeo-tarjetas" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <CreditCard size={16} /> Mapeo tarjeta → económico
          </Link>
          <Link href="/combustible/importar" className="flex items-center gap-2 rounded-md px-4 h-10 font-semibold" style={{ background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
            <Upload size={16} /> Importar transacciones
          </Link>
        </div>
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
            Transacciones por unidad
          </h3>
          {grupos.length === 0 ? (
            <EmptyState>Sin transacciones registradas.</EmptyState>
          ) : (
            <CombustibleAcordeon grupos={grupos} />
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
