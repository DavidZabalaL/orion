import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { AuditoriaLista } from "@/components/auditoria/auditoria-lista";
import { ChecklistDiarioLista } from "@/components/auditoria/checklist-diario-lista";
import { ClipboardList, AlertOctagon, CheckCircle2, Scale } from "lucide-react";
import { fmtMoney } from "@/lib/formato";
import { requerirPermisoModulo } from "@/lib/permisos";
import { proyectosPermitidosParaModulo } from "@/lib/proyectos-usuario";
import { inicioDeHoyMx as inicioDeHoy } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  await requerirPermisoModulo("I");
  const proyectosPermitidos = await proyectosPermitidosParaModulo("I");
  const filtroProyecto = proyectosPermitidos !== null ? { proyectoId: { in: proyectosPermitidos } } : {};
  const filtroUnidadRelacion = proyectosPermitidos !== null ? { unidad: filtroProyecto } : {};

  const [auditorias, unidadesActivas, checklistsHoy, combustibleHoy, tagsHoy] = await Promise.all([
    prisma.auditoria.findMany({
      where: filtroUnidadRelacion,
      orderBy: { fechaRevision: "desc" },
      take: 40,
      include: { unidad: { select: { numeroEconomico: true, marca: true, unidadModelo: true } } },
    }),
    prisma.unidad.findMany({ where: { estatus: "ACTIVO", ...filtroProyecto }, select: { numeroEconomico: true } }),
    prisma.checklist.findMany({ where: { fecha: { gte: inicioDeHoy() }, ...filtroUnidadRelacion }, select: { numeroEconomico: true } }),
    prisma.combustible.findMany({ where: { fecha: { gte: inicioDeHoy() }, ...filtroUnidadRelacion }, select: { numeroEconomico: true } }),
    prisma.tag.findMany({ where: { fecha: { gte: inicioDeHoy() }, ...filtroUnidadRelacion }, select: { numeroEconomico: true } }),
  ]);

  const serializado = JSON.parse(JSON.stringify(auditorias));

  const abiertas = auditorias.filter((a) => a.estatus === "ABIERTA");
  const resueltas = auditorias.filter((a) => a.estatus === "RESUELTA");
  const diferenciaTotal = abiertas.reduce((acc, a) => acc + Number(a.diferencia), 0);

  const checklistSet = new Set(checklistsHoy.map((c) => c.numeroEconomico));
  const combustibleSet = new Set(combustibleHoy.map((c) => c.numeroEconomico));
  const tagSet = new Set(tagsHoy.map((c) => c.numeroEconomico).filter((n): n is string => n !== null));
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
        <AuditoriaLista auditorias={serializado} />
      </div>

      <div>
        <h3 className="mb-3" style={{ fontFamily: "var(--font)", fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--sidebar-text-active)" }}>
          Checklist de Actualización Diaria por unidad activa
        </h3>
        <ChecklistDiarioLista
          unidades={unidadesActivas}
          checklistSet={Array.from(checklistSet)}
          combustibleSet={Array.from(combustibleSet)}
          tagSet={Array.from(tagSet)}
        />
      </div>
    </div>
  );
}
