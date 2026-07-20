import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/table";
import { AuditoriaRow } from "@/components/auditoria/auditoria-row";
import { ClipboardList, AlertOctagon, CheckCircle2, Scale } from "lucide-react";
import { fmtMoney } from "@/lib/formato";

export const dynamic = "force-dynamic";

function inicioDeHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AuditoriaPage() {
  const [auditorias, unidadesActivas, checklistsHoy, combustibleHoy, tagsHoy] = await Promise.all([
    prisma.auditoria.findMany({
      orderBy: { fechaRevision: "desc" },
      take: 40,
      include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } } },
    }),
    prisma.unidad.findMany({ where: { estatus: "ACTIVO" }, select: { numeroEconomico: true } }),
    prisma.checklist.findMany({ where: { fecha: { gte: inicioDeHoy() } }, select: { numeroEconomico: true } }),
    prisma.combustible.findMany({ where: { fecha: { gte: inicioDeHoy() } }, select: { numeroEconomico: true } }),
    prisma.tag.findMany({ where: { fecha: { gte: inicioDeHoy() } }, select: { numeroEconomico: true } }),
  ]);

  const serializado = JSON.parse(JSON.stringify(auditorias));

  const abiertas = auditorias.filter((a) => a.estatus === "ABIERTA");
  const resueltas = auditorias.filter((a) => a.estatus === "RESUELTA");
  const diferenciaTotal = abiertas.reduce((acc, a) => acc + Number(a.diferencia), 0);

  const checklistSet = new Set(checklistsHoy.map((c) => c.numeroEconomico));
  const combustibleSet = new Set(combustibleHoy.map((c) => c.numeroEconomico));
  const tagSet = new Set(tagsHoy.map((c) => c.numeroEconomico));
  const sinCapturaCompleta = unidadesActivas.filter((u) => !checklistSet.has(u.numeroEconomico));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Auditoría diaria y calidad
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Conciliación PTTO / REAL / CV y bitácora de auditoría, unidad por unidad.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Discrepancias abiertas" value={abiertas.length} icon={AlertOctagon} accent="var(--color-status-escena)" />
        <StatCard label="Resueltas" value={resueltas.length} icon={CheckCircle2} accent="var(--color-status-cerrado)" />
        <StatCard label="Diferencia acumulada" value={fmtMoney(diferenciaTotal)} icon={Scale} accent="var(--color-status-revision)" />
        <StatCard label="Unidades sin checklist hoy" value={sinCapturaCompleta.length} icon={ClipboardList} accent="var(--color-primary)" />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Panel de Conciliación Diaria
        </h3>
        {serializado.length === 0 ? (
          <EmptyState>Sin registros de auditoría todavía.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                  {["Fecha", "Unidad", "Categoría", "PTTO", "REAL", "CV", "Diferencia", "Estatus", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serializado.map((a: {
                  id: string; fechaRevision: string; unidad: { numeroEconomico: string };
                  categoriaGasto: string; montoPptto: string; montoReal: string; montoCv: string;
                  diferencia: string; estatus: string; tipoDiscrepancia: string | null; resolucion: string | null;
                }) => (
                  <AuditoriaRow key={a.id} auditoria={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Checklist de Actualización Diaria por unidad activa
        </h3>
        <div className="overflow-x-auto rounded-xl" style={{ background: "var(--panel-bg)", boxShadow: "var(--shadow-sm)" }}>
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--field-border)" }}>
                {["Unidad", "Checklist", "Combustible", "TAG"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--sidebar-text)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unidadesActivas.map((u) => (
                <tr key={u.numeroEconomico} style={{ borderBottom: "1px solid var(--field-border)" }}>
                  <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>{u.numeroEconomico}</td>
                  <td className="px-4 py-3">{checklistSet.has(u.numeroEconomico) ? <Dot ok /> : <Dot />}</td>
                  <td className="px-4 py-3">{combustibleSet.has(u.numeroEconomico) ? <Dot ok /> : <Dot />}</td>
                  <td className="px-4 py-3">{tagSet.has(u.numeroEconomico) ? <Dot ok /> : <Dot />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Dot({ ok = false }: { ok?: boolean }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ok ? "var(--resource-disponible)" : "var(--priority-alta)" }} />;
}
