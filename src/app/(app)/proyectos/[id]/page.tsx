import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Table, EmptyState } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/formato";
import { ESTATUS_UNIDAD_LABEL, ESTATUS_UNIDAD_STYLE } from "@/lib/estatus";
import { PresupuestoAnual } from "@/components/proyectos/presupuesto-anual";
import { obtenerResumenPresupuestoAnual } from "@/lib/presupuesto";

export const dynamic = "force-dynamic";

export default async function FichaProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      unidades: { select: { numeroEconomico: true, marca: true, unidadModelo: true, estatus: true, disponibilidad: true } },
      operadores: { select: { id: true, nombre: true, estatus: true } },
    },
  });

  if (!proyecto) notFound();

  const anioActual = new Date().getFullYear();
  const [gastos, combustible, tags, resumenPresupuesto] = await Promise.all([
    prisma.gastoVehicular.aggregate({ where: { numeroEconomico: { in: proyecto.unidades.map((u) => u.numeroEconomico) } }, _sum: { costo: true } }),
    prisma.combustible.aggregate({ where: { numeroEconomico: { in: proyecto.unidades.map((u) => u.numeroEconomico) } }, _sum: { costo: true } }),
    prisma.tag.aggregate({ where: { numeroEconomico: { in: proyecto.unidades.map((u) => u.numeroEconomico) } }, _sum: { monto: true } }),
    obtenerResumenPresupuestoAnual(proyecto.id, anioActual),
  ]);

  const gastoAcumulado = Number(gastos._sum.costo ?? 0) + Number(combustible._sum.costo ?? 0) + Number(tags._sum.monto ?? 0);
  const disponibles = proyecto.unidades.filter((u) => u.disponibilidad).length;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <Link href="/proyectos" className="inline-flex items-center gap-1 w-fit" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text)" }}>
          <ChevronLeft size={15} /> Volver a proyectos
        </Link>
        <h1 className="mt-2" style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          {proyecto.nombre}
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>{proyecto.estadoRepublica}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl p-5 md:grid-cols-4" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
        <Stat label="Unidades" value={String(proyecto.unidades.length)} />
        <Stat label="Disponibles" value={String(disponibles)} />
        <Stat label="Operadores" value={String(proyecto.operadores.length)} />
        <Stat label="Gasto acumulado (histórico)" value={fmtMoney(gastoAcumulado)} mono />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Presupuesto anual y asignación mensual
        </h3>
        <PresupuestoAnual proyectoId={proyecto.id} resumen={resumenPresupuesto} />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Unidades asignadas
        </h3>
        {proyecto.unidades.length === 0 ? (
          <EmptyState>Sin unidades asignadas a este proyecto.</EmptyState>
        ) : (
          <Table headers={["N° económico", "Marca / Unidad", "Estatus", "Disponibilidad"]} minWidth={560}>
            {proyecto.unidades.map((u) => (
              <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                <td className="px-4 py-3">
                  <Link href={`/unidades/${u.numeroEconomico}`} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.numeroEconomico}</Link>
                </td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-base)", color: "var(--field-text)" }}>{u.marca} {u.unidadModelo}</td>
                <td className="px-4 py-3"><Badge label={ESTATUS_UNIDAD_LABEL[u.estatus]} color={ESTATUS_UNIDAD_STYLE[u.estatus]?.color} bg={ESTATUS_UNIDAD_STYLE[u.estatus]?.bg} /></td>
                <td className="px-4 py-3">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: u.disponibilidad ? "var(--resource-disponible)" : "var(--sidebar-text)" }} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Operadores del proyecto
        </h3>
        {proyecto.operadores.length === 0 ? (
          <EmptyState>Sin operadores asignados.</EmptyState>
        ) : (
          <div className="flex flex-wrap gap-2">
            {proyecto.operadores.map((o) => (
              <Link
                key={o.id}
                href={`/operadores/${o.id}`}
                className="rounded-md px-3 py-2"
                style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)", fontFamily: "var(--font-ui)", fontSize: "var(--text-sm)", color: "var(--sidebar-text-active)" }}
              >
                {o.nombre}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: mono ? "var(--font-mono)" : "var(--font)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }} className="mt-1">{value}</div>
    </div>
  );
}
