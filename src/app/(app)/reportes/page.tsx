import Link from "next/link";
import { Car, Wallet, ShieldAlert, Wrench, IdCard, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { fmtMoney } from "@/lib/formato";
import { CATEGORIA_GASTO_LABEL } from "@/lib/categorias-gasto";
import { obtenerResumenPresupuestoAnual } from "@/lib/presupuesto";

export const dynamic = "force-dynamic";

function en(dias: number) {
  return new Date(Date.now() + dias * 86_400_000);
}

export default async function ReportesPage() {
  const anioActual = new Date().getFullYear();
  const [
    unidadesPorEstatus,
    gastoPorCategoria,
    mantenimientosPorVencer,
    segurosPorVencer,
    documentosPorVencer,
    proyectos,
  ] = await Promise.all([
    prisma.unidad.groupBy({ by: ["estatus"], _count: { _all: true } }),
    prisma.gastoVehicular.groupBy({ by: ["categoria"], _sum: { costo: true }, orderBy: { _sum: { costo: "desc" } }, take: 6 }),
    prisma.gastoVehicular.count({ where: { estatus: "PROGRAMADO", fecha: { lte: en(15) } } }),
    prisma.seguro.count({ where: { fechaVencimiento: { lte: en(30) }, estatus: { in: ["VIGENTE", "POR_VENCER"] } } }),
    prisma.documentoOperador.count({ where: { fechaVencimiento: { lte: en(60) }, operador: { estatus: "ACTIVO" } } }),
    prisma.proyecto.findMany({ where: { estatus: "ACTIVO" }, select: { id: true, nombre: true, presupuestoAprobadoAnual: true } }),
  ]);

  const resumenesPresupuesto = await Promise.all(proyectos.map((p) => obtenerResumenPresupuestoAnual(p.id, anioActual)));

  const totalUnidades = unidadesPorEstatus.reduce((acc, u) => acc + u._count._all, 0);
  const disponibles = unidadesPorEstatus.find((u) => u.estatus === "ACTIVO")?._count._all ?? 0;
  const bajas = unidadesPorEstatus.find((u) => u.estatus === "BAJA")?._count._all ?? 0;
  const gastoTotal = gastoPorCategoria.reduce((acc, g) => acc + Number(g._sum.costo ?? 0), 0);

  const presupuestoTotal = proyectos.reduce((acc, p) => acc + Number(p.presupuestoAprobadoAnual), 0);
  const gastadoTotal = resumenesPresupuesto.reduce((acc, r) => acc + r.gastoAnual, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
            Dashboard Ejecutivo
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
            Vista consolidada de la flota, gasto y vencimientos.
          </p>
        </div>
        <Link href="/reportes/generador" className="flex items-center gap-2 rounded-md px-4 h-10" style={{ background: "var(--panel-bg)", color: "var(--sidebar-text-active)", fontFamily: "var(--font-ui)", fontSize: "var(--text-base)" }}>
          <Settings2 size={16} /> Generador de reportes
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Unidades totales" value={totalUnidades} icon={Car} accent="var(--color-primary)" />
        <StatCard label="Activas / disponibles" value={disponibles} icon={Car} accent="var(--color-status-cerrado)" />
        <StatCard label="Bajas" value={bajas} icon={Car} accent="var(--color-status-escena)" />
        <StatCard label="Gasto total registrado" value={fmtMoney(gastoTotal)} icon={Wallet} accent="var(--color-status-asignado)" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Mantenimientos por vencer (15d)" value={mantenimientosPorVencer} icon={Wrench} accent="var(--color-status-revision)" />
        <StatCard label="Seguros por vencer (30d)" value={segurosPorVencer} icon={ShieldAlert} accent="var(--color-status-revision)" />
        <StatCard label="Documentos de operador por vencer (60d)" value={documentosPorVencer} icon={IdCard} accent="var(--color-status-revision)" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Gasto por categoría
          </h3>
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            {gastoPorCategoria.length === 0 ? (
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>Sin datos.</p>
            ) : (
              gastoPorCategoria.map((g) => {
                const monto = Number(g._sum.costo ?? 0);
                const pct = gastoTotal > 0 ? (monto / gastoTotal) * 100 : 0;
                return (
                  <div key={g.categoria}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{CATEGORIA_GASTO_LABEL[g.categoria]}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{fmtMoney(monto)}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "var(--chip)" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "var(--color-primary)" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
            Presupuesto {anioActual} por proyecto
          </h3>
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between mb-2" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
              <span>Total</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--sidebar-text-active)" }}>{fmtMoney(gastadoTotal)} / {fmtMoney(presupuestoTotal)}</span>
            </div>
            {proyectos.map((p, i) => {
              const resumen = resumenesPresupuesto[i];
              const pct = resumen.presupuestoAprobadoAnual > 0 ? Math.min(100, (resumen.gastoAnual / resumen.presupuestoAprobadoAnual) * 100) : 0;
              return (
                <div key={p.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--field-text)" }}>{p.nombre}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--chip)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--color-status-escena)" : "var(--color-status-cerrado)" }} />
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
