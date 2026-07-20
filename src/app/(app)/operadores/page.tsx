import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { OperadoresTable, type OperadorRow } from "@/components/operadores/operadores-table";
import { IdCard, CheckCircle2, AlertTriangle, Ban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OperadoresPage() {
  const operadores = await prisma.operador.findMany({
    include: {
      proyecto: { select: { nombre: true } },
      unidadesResguardadas: { select: { numeroEconomico: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const rows: OperadorRow[] = operadores.map((o) => ({
    id: o.id,
    nombre: o.nombre,
    curp: o.curp,
    proyecto: o.proyecto?.nombre ?? null,
    unidades: o.unidadesResguardadas.map((u) => u.numeroEconomico),
    estatus: o.estatus,
    estatusDocumental: o.estatusDocumental,
  }));

  const total = rows.length;
  const completos = rows.filter((r) => r.estatusDocumental === "COMPLETO").length;
  const incompletos = rows.filter((r) => r.estatusDocumental === "INCOMPLETO").length;
  const vencidos = rows.filter((r) => r.estatusDocumental === "VENCIDO").length;

  const proyectosOptions = Array.from(new Set(rows.map((r) => r.proyecto).filter(Boolean))) as string[];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 style={{ fontFamily: "var(--font)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--sidebar-text-active)" }}>
          Gestión de Operadores
        </h1>
        <p style={{ fontFamily: "var(--font-ui)", fontSize: "var(--text-md)", color: "var(--sidebar-text)" }}>
          Expediente digital completo de cada operador, vinculado a las unidades que opera.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Operadores totales" value={total} icon={IdCard} accent="var(--color-primary)" />
        <StatCard label="Documentación completa" value={completos} icon={CheckCircle2} accent="var(--color-status-cerrado)" />
        <StatCard label="Documentación incompleta" value={incompletos} icon={AlertTriangle} accent="var(--color-status-revision)" />
        <StatCard label="Documentación vencida" value={vencidos} icon={Ban} accent="var(--color-status-escena)" />
      </div>

      <OperadoresTable rows={rows} proyectos={proyectosOptions} />
    </div>
  );
}
